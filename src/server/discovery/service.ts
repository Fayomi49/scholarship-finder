import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { AccessError } from "@/server/errors";
import {
  filtersSchema,
  type Opportunity,
  type Filters,
} from "@/features/discovery/schema";
import { buildQueries } from "@/features/discovery/queries";
import {
  canonicalUrl,
  identityKey,
  intakeKey,
  possibleDuplicate,
} from "@/features/discovery/identity";
import { opportunitySchema } from "@/features/discovery/schema";

export const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function startRun(ownerId: string, input: Filters) {
  const filters = filtersSchema.parse(input);
  const provider = process.env.DISCOVERY_SEARCH_PROVIDER ?? "mock";
  if (!["mock", "tavily"].includes(provider))
    throw new AccessError(503, "Unsupported search provider.");
  if (
    provider === "tavily" &&
    (!process.env.TAVILY_API_KEY || !process.env.DISCOVERY_USER_AGENT)
  )
    throw new AccessError(
      503,
      "Configure Tavily and the crawler identity before live discovery.",
    );
  if (provider === "tavily") {
    const limited = await db().discoveryRun.findFirst({
      where: { provider, retryAfter: { gt: new Date() } },
      orderBy: { retryAfter: "desc" },
    });
    if (limited?.retryAfter)
      throw new AccessError(
        429,
        `Search rate limit reached. Retry after ${limited.retryAfter.toISOString()}.`,
      );
  }
  const active = await db().discoveryRun.findFirst({
    where: { ownerId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (active) return { run: active, existing: true };
  try {
    return {
      run: await db().discoveryRun.create({
        data: {
          ownerId,
          provider,
          filters: json(filters),
          queries: buildQueries(filters),
        },
      }),
      existing: false,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const run = await db().discoveryRun.findFirstOrThrow({
        where: { ownerId, status: { in: ["QUEUED", "RUNNING"] } },
      });
      return { run, existing: true };
    }
    throw error;
  }
}

export async function storeCandidate(
  runId: string,
  observationId: string,
  op: Opportunity,
  source: {
    official: boolean;
    evidence: unknown;
    status: string;
    fetchedAt?: Date;
  },
  isMock: boolean,
) {
  return db().$transaction(async (tx) => {
    const observation = await tx.discoveryObservation.findUniqueOrThrow({
      where: { id: observationId },
    });
    if (observation.outcome !== "pending") return;
    const run = await tx.discoveryRun.findUniqueOrThrow({
      where: { id: runId },
    });
    const data = {
      ...op,
      sourceUrl: canonicalUrl(op.sourceUrl),
      applicationUrl: op.applicationUrl
        ? canonicalUrl(op.applicationUrl)
        : null,
    };
    const canonical = data.sourceUrl;
    const identity = identityKey(data);
    const edition = intakeKey(data);
    const urls = [
      canonical,
      ...(data.applicationUrl ? [data.applicationUrl] : []),
    ];
    const main = isMock
      ? null
      : await tx.scholarship.findFirst({
          where: {
            OR: [
              { identityKey: identity },
              { canonicalUrl: { in: urls }, intakeKey: edition },
              { applicationUrl: { in: urls }, intakeKey: edition },
            ],
          },
        });
    const previous = await tx.discoveredCandidate.findFirst({
      where: {
        ownerId: run.ownerId,
        isMock,
        OR: [
          { canonicalUrl: { in: urls }, intakeKey: edition },
          { identityKey: identity },
          ...urls.map((u) => ({
            data: { path: ["applicationUrl"], equals: u },
            intakeKey: edition,
          })),
        ],
      },
    });
    let candidate = previous;
    if (!main && !candidate) {
      const pool = await tx.discoveredCandidate.findMany({
        where: { ownerId: run.ownerId, isMock },
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      const possible = pool.find((c) => {
        const p = opportunitySchema.safeParse(c.data);
        return p.success && possibleDuplicate(data, p.data);
      });
      candidate = await tx.discoveredCandidate.create({
        data: {
          ownerId: run.ownerId,
          canonicalUrl: canonical,
          identityKey: identity,
          intakeKey: edition,
          data: json(data),
          isMock,
          possibleDuplicateId: possible?.id,
        },
      });
      await tx.candidateSource.create({
        data: {
          candidateId: candidate.id,
          url: data.sourceUrl,
          isOfficial: source.official,
          status: source.status,
          evidence: json(source.evidence),
          fetchedAt: source.fetchedAt,
        },
      });
    }
    const duplicate = Boolean(main || previous);
    const reviewed = Boolean(
      main || (previous && previous.status !== "PENDING"),
    );
    await tx.discoveryObservation.update({
      where: { id: observation.id },
      data: {
        outcome: main
          ? "approved-duplicate"
          : previous
            ? reviewed
              ? "previously-reviewed"
              : "duplicate"
            : "new",
        candidateId: candidate?.id,
      },
    });
    await tx.discoveryRun.update({
      where: { id: runId },
      data: {
        resultsCount: { increment: 1 },
        duplicatesCount: { increment: duplicate ? 1 : 0 },
        reviewedCount: { increment: reviewed ? 1 : 0 },
      },
    });
  });
}
