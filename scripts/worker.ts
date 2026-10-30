import { PgBoss } from "pg-boss";
import { db } from "../src/server/db";
import { executeRun } from "../src/server/discovery/pipeline";
import { json } from "../src/server/discovery/service";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const boss = new PgBoss(process.env.DATABASE_URL);
  boss.on("error", () =>
    console.error("Discovery queue error. Check database connectivity."),
  );
  await boss.start();
  await boss.createQueue("scholarship-discovery", {
    policy: "exclusive",
    retryLimit: 2,
    retryDelay: 10,
    retryBackoff: true,
    expireInSeconds: 3600,
  });
  await boss.work<
    { runId: string },
    void,
    { includeMetadata: true; batchSize: 1 }
  >(
    "scholarship-discovery",
    { includeMetadata: true, batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        try {
          await executeRun(job.data.runId);
        } catch {
          if (job.retryCount >= job.retryLimit)
            await db().discoveryRun.updateMany({
              where: {
                id: job.data.runId,
                status: { in: ["QUEUED", "RUNNING"] },
              },
              data: {
                status: "FAILED",
                stage: "worker-failed",
                errors: json([
                  { code: "worker-failed", at: new Date().toISOString() },
                ]),
                finishedAt: new Date(),
              },
            });
          throw new Error(
            "Discovery processing failed. Durable checkpoints will be retried.",
          );
        }
      }
    },
  );
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log("Discovery worker ready. Waiting for owner-requested runs.");
  while (!stopping) {
    try {
      // DiscoveryRun is the transactional outbox: a committed run is never dependent on web-process lifetime.
      const runs = await db().discoveryRun.findMany({
        where: { status: { in: ["QUEUED", "RUNNING"] } },
        select: { id: true },
        take: 20,
      });
      for (const run of runs)
        await boss.send(
          "scholarship-discovery",
          { runId: run.id },
          { singletonKey: run.id },
        );
    } catch {
      console.error(
        "Could not dispatch discovery runs. Retrying in five seconds.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  await boss.stop({ graceful: true, timeout: 30000 });
  await db().$disconnect();
}
main().catch(() => {
  console.error(
    "Worker could not start. Check DATABASE_URL and apply migrations.",
  );
  process.exitCode = 1;
});
