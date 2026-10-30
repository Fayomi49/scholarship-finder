// @vitest-environment node
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("./search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./search")>()),
  search: mocks.search,
}));
import { db } from "@/server/db";
import { startRun, json } from "./service";
import { executeRun } from "./pipeline";
import { reviewCandidate } from "./review";
import { RateLimitError } from "./rate-limit";
import { unknownOpportunity } from "@/features/discovery/schema";

const url = process.env.TEST_DATABASE_URL;
const ownerId = `integration-${randomUUID()}`;
const op = {
  ...unknownOpportunity(
    "Synthetic integration opportunity",
    "https://integration.example/programme",
  ),
  provider: "Integration provider",
  region: "europe" as const,
  country: "DE",
  fields: ["computer-science" as const],
  opportunityType: "masters-scholarship" as const,
};
describe.skipIf(!url)("PostgreSQL discovery and approval integration", () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (target.hostname !== "127.0.0.1" || target.port !== "55439")
      throw new Error(
        "Integration tests require the isolated temporary PostgreSQL instance on port 55439.",
      );
    process.env.DATABASE_URL = url;
    process.env.DISCOVERY_SEARCH_PROVIDER = "mock";
    await db().user.create({ data: { id: ownerId } });
  });
  afterAll(async () => {
    const ids = (
      await db().discoveredCandidate.findMany({
        where: { ownerId },
        select: { id: true },
      })
    ).map((r) => r.id);
    await db().reviewEvent.deleteMany({ where: { reviewerId: ownerId } });
    await db().candidateSource.deleteMany({
      where: { candidateId: { in: ids } },
    });
    await db().discoveryObservation.deleteMany({ where: { run: { ownerId } } });
    await db().discoveredCandidate.deleteMany({ where: { ownerId } });
    await db().discoveryRun.deleteMany({ where: { ownerId } });
    await db().scholarship.deleteMany({ where: { createdById: ownerId } });
    await db().user.delete({ where: { id: ownerId } });
    await db().$disconnect();
  });
  it("deduplicates concurrent run starts and replays checkpoints without republishing", async () => {
    const [a, b] = await Promise.all([
      startRun(ownerId, {}),
      startRun(ownerId, {}),
    ]);
    expect(a.run.id).toBe(b.run.id);
    await executeRun(a.run.id);
    let run = await db().discoveryRun.findUniqueOrThrow({
      where: { id: a.run.id },
    });
    expect(run.status).toBe("COMPLETED");
    expect(run.resultsCount).toBe(3);
    expect(run.duplicatesCount).toBe(1);
    expect(
      await db().scholarship.count({ where: { createdById: ownerId } }),
    ).toBe(0);
    await db().discoveryRun.update({
      where: { id: a.run.id },
      data: { status: "RUNNING", finishedAt: null },
    });
    await executeRun(a.run.id);
    run = await db().discoveryRun.findUniqueOrThrow({
      where: { id: a.run.id },
    });
    expect(run.resultsCount).toBe(3);
    const candidate = await db().discoveredCandidate.findFirstOrThrow({
      where: { ownerId },
    });
    await expect(
      reviewCandidate(ownerId, {
        id: candidate.id,
        action: "approve",
        officialSourceConfirmed: true,
        importantClaimsChecked: true,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await reviewCandidate(ownerId, { id: candidate.id, action: "ignore" });
    const next = await startRun(ownerId, {});
    await executeRun(next.run.id);
    const nextRun = await db().discoveryRun.findUniqueOrThrow({
      where: { id: next.run.id },
    });
    expect(nextRun.reviewedCount).toBeGreaterThan(0);
    expect(await db().discoveredCandidate.count({ where: { ownerId } })).toBe(
      2,
    );
  });
  it("enforces ownership, review confirmation and atomic concurrent approval", async () => {
    const c = await db().discoveredCandidate.create({
      data: {
        ownerId,
        canonicalUrl: op.sourceUrl,
        identityKey: randomUUID(),
        data: json(op),
      },
    });
    await expect(
      reviewCandidate("someone-else", { id: c.id, action: "approve" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      reviewCandidate(ownerId, { id: c.id, action: "approve" }),
    ).rejects.toMatchObject({ status: 400 });
    const command = {
      id: c.id,
      action: "approve",
      officialSourceConfirmed: true,
      importantClaimsChecked: true,
    };
    const results = await Promise.all([
      reviewCandidate(ownerId, command),
      reviewCandidate(ownerId, command),
    ]);
    expect(results[0].scholarshipId).toBe(results[1].scholarshipId);
    expect(
      await db().scholarship.count({ where: { createdById: ownerId } }),
    ).toBe(1);
    expect(await db().reviewEvent.count({ where: { candidateId: c.id } })).toBe(
      1,
    );
  });
  it("rolls back duplicate publication and keeps the candidate pending", async () => {
    const c = await db().discoveredCandidate.create({
      data: {
        ownerId,
        canonicalUrl: op.sourceUrl + "/alternate",
        identityKey: randomUUID(),
        data: json(op),
      },
    });
    await expect(
      reviewCandidate(ownerId, {
        id: c.id,
        action: "approve",
        officialSourceConfirmed: true,
        importantClaimsChecked: true,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await db().discoveredCandidate.findUniqueOrThrow({
          where: { id: c.id },
        })
      ).status,
    ).toBe("PENDING");
  });
  it("records search failure without inventing candidates", async () => {
    process.env.DISCOVERY_SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "test-fixture";
    process.env.DISCOVERY_USER_AGENT =
      "ScholarshipFinder/1.0 (integration fixture)";
    mocks.search.mockRejectedValue(new Error("search-rejected"));
    const { run } = await startRun(ownerId, {});
    await executeRun(run.id);
    const result = await db().discoveryRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(result.status).toBe("FAILED");
    expect(result.searchCalls).toBeLessThanOrEqual(8);
    expect(result.errors).not.toEqual([]);
    expect(result.resultsCount).toBe(0);
  });
  it("preserves distinct known intakes at the same programme URL", async () => {
    for (const intake of ["2027", "2028"]) {
      const candidate = await db().discoveredCandidate.create({
        data: {
          ownerId,
          canonicalUrl: op.sourceUrl,
          intakeKey: intake,
          identityKey: randomUUID(),
          data: json({ ...op, intake }),
        },
      });
      await reviewCandidate(ownerId, {
        id: candidate.id,
        action: "approve",
        officialSourceConfirmed: true,
        importantClaimsChecked: true,
      });
    }
    expect(
      await db().scholarship.count({
        where: { createdById: ownerId, sourceUrl: op.sourceUrl },
      }),
    ).toBe(3);
  });
  it("persists search cooldowns and makes no further requests after a rate limit", async () => {
    process.env.DISCOVERY_SEARCH_PROVIDER = "tavily";
    mocks.search.mockReset();
    mocks.search.mockRejectedValue(
      new RateLimitError("search-rate-limited", new Date(Date.now() + 60000)),
    );
    const { run } = await startRun(ownerId, {});
    await executeRun(run.id);
    expect(mocks.search).toHaveBeenCalledTimes(1);
    const stored = await db().discoveryRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(stored.retryAfter?.getTime()).toBeGreaterThan(Date.now());
    await expect(startRun(ownerId, {})).rejects.toMatchObject({ status: 429 });
  });
});
