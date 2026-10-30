import "server-only";
import { db } from "@/server/db";
import {
  filtersSchema,
  opportunitySchema,
  unknownOpportunity,
} from "@/features/discovery/schema";
import { mockCandidates } from "@/features/discovery/fixtures";
import { search, searchResultSchema } from "./search";
import { fetchPage } from "./fetch";
import { extract } from "./extract";
import { json, storeCandidate } from "./service";
import { RateLimitError } from "./rate-limit";
import { safeUrl } from "@/features/discovery/url-safety";

const codes = new Set([
  "search-credentials-required",
  "search-transient",
  "search-rate-limited",
  "host-rate-limited",
  "search-rejected",
  "search-response-too-large",
  "source-permission-required",
  "unsafe-url",
  "unsafe-host",
  "unsafe-address",
  "access-restricted",
  "unsupported-content",
  "page-too-large",
  "page-unavailable",
  "robots-unavailable",
  "robots-disallowed",
  "robots-redirect-needs-review",
  "too-many-redirects",
  "crawler-identity-required",
  "crawl-delay-exceeds-run-limit",
  "transient-http",
  "page-budget-exhausted",
]);
export function errorCode(error: unknown) {
  return error instanceof Error && codes.has(error.message)
    ? error.message
    : error instanceof Error &&
        /timeout|timed out|fetch failed|ECONNRESET/i.test(
          error.message + error.name,
        )
      ? "transient-http"
      : "processing-failed";
}
async function addError(runId: string, code: string, url?: string) {
  const run = await db().discoveryRun.findUniqueOrThrow({
    where: { id: runId },
  });
  const existing = Array.isArray(run.errors) ? run.errors : [];
  await db().discoveryRun.update({
    where: { id: runId },
    data: {
      errors: json(
        [...existing, { code, url, at: new Date().toISOString() }].slice(-100),
      ),
    },
  });
}
async function observation(runId: string, raw: { title: string; url: string }) {
  return db().discoveryObservation.upsert({
    where: { runId_url: { runId, url: raw.url } },
    create: { runId, url: raw.url, outcome: "pending", searchData: json(raw) },
    update: {},
  });
}
export async function executeRun(runId: string) {
  let run = await db().discoveryRun.findUniqueOrThrow({ where: { id: runId } });
  if (!["QUEUED", "RUNNING"].includes(run.status)) return;
  const filters = filtersSchema.parse(run.filters);
  await db().discoveryRun.update({
    where: { id: runId },
    data: {
      status: "RUNNING",
      stage: "searching",
      startedAt: run.startedAt ?? new Date(),
    },
  });
  if (run.provider === "mock") {
    const fixtures = [
      ...mockCandidates,
      {
        ...mockCandidates[0],
        sourceUrl: mockCandidates[0].sourceUrl + "?utm_source=duplicate",
      },
    ];
    for (const op of fixtures.filter(
      (item) =>
        (!filters.field || item.fields.includes(filters.field)) &&
        (!filters.opportunityType ||
          item.opportunityType === filters.opportunityType) &&
        (!filters.region || item.region === filters.region) &&
        (!filters.fundingType || item.fundingType === filters.fundingType),
    )) {
      const row = await observation(runId, {
        title: op.title,
        url: op.sourceUrl,
      });
      await storeCandidate(
        runId,
        row.id,
        op,
        { official: false, evidence: {}, status: "synthetic-fixture" },
        true,
      );
    }
  } else {
    // Persist each query checkpoint and reserve each billable attempt before making the request.
    for (let index = run.nextQuery; index < run.queries.length; index++) {
      let results: Awaited<ReturnType<typeof search>> = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        run = await db().discoveryRun.findUniqueOrThrow({
          where: { id: runId },
        });
        if (
          run.searchCalls >= 8 ||
          (run.retryAfter && run.retryAfter.getTime() > Date.now())
        )
          break;
        await db().discoveryRun.update({
          where: { id: runId },
          data: { searchCalls: { increment: 1 } },
        });
        try {
          results = await search(run.queries[index]);
          break;
        } catch (error) {
          await addError(runId, errorCode(error));
          if (error instanceof RateLimitError)
            await db().discoveryRun.update({
              where: { id: runId },
              data: { retryAfter: error.retryAfter },
            });
          if (errorCode(error) !== "search-transient" || attempt === 2) break;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * 2 ** attempt),
          );
        }
      }
      await db().$transaction(async (tx) => {
        for (const raw of results)
          await tx.discoveryObservation.upsert({
            where: { runId_url: { runId, url: raw.url } },
            create: {
              runId,
              url: raw.url,
              outcome: "pending",
              searchData: json(raw),
            },
            update: {},
          });
        await tx.discoveryRun.update({
          where: { id: runId },
          data: { nextQuery: index + 1 },
        });
      });
    }
    await db().discoveryRun.update({
      where: { id: runId },
      data: { stage: "fetching-and-validating" },
    });
    const pending = await db().discoveryObservation.findMany({
      where: { runId, outcome: "pending" },
      orderBy: { createdAt: "asc" },
    });
    const officialHosts = new Set(
      (
        await db().sourcePolicy.findMany({
          where: { allowed: true, official: true },
          select: { hostname: true },
        })
      ).map((p) => p.hostname),
    );
    pending.sort(
      (a, b) =>
        Number(officialHosts.has(new URL(b.url).hostname)) -
        Number(officialHosts.has(new URL(a.url).hostname)),
    );
    // One content fetch at a time also enforces the single-owner per-host pacing policy.
    for (const row of pending) {
      const raw = searchResultSchema.parse(row.searchData);
      const latest = await db().discoveryRun.findUniqueOrThrow({
        where: { id: runId },
      });
      let op = unknownOpportunity(raw.title, raw.url);
      let source: {
        official: boolean;
        evidence: unknown;
        status: string;
        fetchedAt?: Date;
      } = { official: false, evidence: {}, status: "unverified-lead" };
      if (latest.pagesFetched >= 20) {
        source.status = "page-budget-exhausted";
        await addError(runId, "page-budget-exhausted", raw.url);
      } else {
        try {
          safeUrl(raw.url);
          // Retries consume page slots. Policy/robots denials are never retried.
          for (let attempt = 0; attempt < 3; attempt++) {
            const budget = await db().discoveryRun.findUniqueOrThrow({
              where: { id: runId },
            });
            if (budget.pagesFetched >= 20) break;
            try {
              const page = await fetchPage(raw.url, async () => {
                const current = await db().discoveryRun.findUniqueOrThrow({
                  where: { id: runId },
                });
                if (current.pagesFetched >= 20)
                  throw new Error("page-budget-exhausted");
                await db().discoveryRun.update({
                  where: { id: runId },
                  data: { pagesFetched: { increment: 1 } },
                });
              });
              const extracted = extract(page.html, page.url, raw.title);
              op = extracted.data;
              source = {
                official: page.official,
                evidence: extracted.evidence,
                status: page.official
                  ? "official-source-needs-review"
                  : "third-party-needs-review",
                fetchedAt: page.fetchedAt,
              };
              break;
            } catch (error) {
              if (errorCode(error) === "transient-http" && attempt < 2) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * 2 ** attempt),
                );
                continue;
              }
              throw error;
            }
          }
        } catch (error) {
          const code = errorCode(error);
          await addError(runId, code, raw.url);
          source.status = code;
          await db().discoveryObservation.update({
            where: { id: row.id },
            data: { errorCode: code },
          });
          if (code.startsWith("unsafe-")) {
            await db().discoveryObservation.update({
              where: { id: row.id },
              data: { outcome: "blocked" },
            });
            continue;
          }
        }
      }
      await storeCandidate(
        runId,
        row.id,
        opportunitySchema.parse(op),
        source,
        false,
      );
    }
  }
  run = await db().discoveryRun.findUniqueOrThrow({ where: { id: runId } });
  const errors = Array.isArray(run.errors) ? run.errors : [];
  await db().discoveryRun.update({
    where: { id: runId },
    data: {
      status: errors.length
        ? run.resultsCount
          ? "PARTIAL"
          : "FAILED"
        : "COMPLETED",
      stage: "finished",
      finishedAt: new Date(),
    },
  });
}
