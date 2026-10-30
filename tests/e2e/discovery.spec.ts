import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { unknownOpportunity } from "../../src/features/discovery/schema";

const testDb = process.env.TEST_DATABASE_URL;
test.describe("isolated database owner workflow", () => {
  test.skip(
    !testDb,
    "Requires the isolated test database, never production credentials.",
  );
  test.describe.configure({ mode: "serial" });
  let pool: Pool;
  let worker: ChildProcess;
  const ownerId = `browser-${randomUUID()}`;
  const token = randomUUID();
  test.beforeAll(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "The public shell is tested on both devices; this workflow also checks a mobile viewport.",
    );
    pool = new Pool({ connectionString: testDb });
    await pool.query('INSERT INTO "User" (id,name) VALUES ($1,$2)', [
      ownerId,
      "Demo test owner",
    ]);
    await pool.query(
      "INSERT INTO \"Account\" (\"userId\",type,provider,\"providerAccountId\") VALUES ($1,'oauth','github','132573008')",
      [ownerId],
    );
    await pool.query(
      'INSERT INTO "Session" ("sessionToken","userId",expires) VALUES ($1,$2,NOW()+INTERVAL \'1 hour\')',
      [token, ownerId],
    );
    worker = spawn(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "scripts/worker.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: testDb,
          DISCOVERY_SEARCH_PROVIDER: "mock",
        },
        stdio: "pipe",
      },
    );
  });
  test.afterAll(async () => {
    if (worker) {
      worker.kill("SIGTERM");
      await Promise.race([
        new Promise<void>((resolve) => worker.once("exit", () => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 10000)),
      ]);
    }
    if (!pool) return;
    await pool.query('DELETE FROM "ReviewEvent" WHERE "reviewerId"=$1', [
      ownerId,
    ]);
    await pool.query(
      'DELETE FROM "CandidateSource" WHERE "candidateId" IN (SELECT id FROM "DiscoveredCandidate" WHERE "ownerId"=$1)',
      [ownerId],
    );
    await pool.query(
      'DELETE FROM "DiscoveryObservation" WHERE "runId" IN (SELECT id FROM "DiscoveryRun" WHERE "ownerId"=$1)',
      [ownerId],
    );
    await pool.query('DELETE FROM "DiscoveredCandidate" WHERE "ownerId"=$1', [
      ownerId,
    ]);
    await pool.query('DELETE FROM "DiscoveryRun" WHERE "ownerId"=$1', [
      ownerId,
    ]);
    await pool.query('DELETE FROM "Scholarship" WHERE "createdById"=$1', [
      ownerId,
    ]);
    await pool.query('DELETE FROM "User" WHERE id=$1', [ownerId]);
    await pool.end();
  });
  test("owner discovers, edits, approves and sees an opportunity in the directory", async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        url: "http://127.0.0.1:3100",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Edit your matching preferences" })
      .click();
    await page.getByLabel("Nationality (country code, optional)").fill("NG");
    await page.getByLabel("Desired level").selectOption("masters");
    await page.getByLabel("computer science", { exact: true }).check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved.")).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel("Nationality (country code, optional)"),
    ).toHaveValue("NG");
    await page.getByRole("link", { name: "← Dashboard" }).click();
    await page.getByRole("button", { name: "Find New Scholarships" }).click();
    await expect(page.getByText(/3 results · 1 duplicates/)).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole("link", { name: /Review discovered/ }).click();
    await expect(
      page.getByRole("heading", {
        name: "[DEMO] Example technology fellowship",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve", exact: true }).first(),
    ).toBeDisabled();
    const op = {
      ...unknownOpportunity(
        "[TEST ONLY] Review workflow fixture",
        "https://browser-fixture.example/opportunity",
      ),
      provider: "Synthetic test provider",
      country: "DE",
      region: "europe",
      fields: ["computer-science"],
      opportunityType: "fellowship",
    };
    await pool.query(
      'INSERT INTO "DiscoveredCandidate" (id,"ownerId","canonicalUrl","identityKey",data,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
      [randomUUID(), ownerId, op.sourceUrl, randomUUID(), JSON.stringify(op)],
    );
    await page.reload();
    await page.getByLabel(/I confirm the source/).check();
    await page.getByLabel(/I checked the extracted claims/).check();
    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: op.title }) });
    await card.getByText("Edit and approve", { exact: true }).click();
    await card
      .getByLabel("Programme name", { exact: true })
      .fill("[TEST ONLY] Reviewed technology fellowship");
    await card.getByRole("button", { name: "Save edits and approve" }).click();
    await expect(page.getByText("Opportunity approved.")).toBeVisible();
    await page.goto("/scholarships");
    await expect(
      page.getByRole("heading", {
        name: "[TEST ONLY] Reviewed technology fellowship",
      }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
