import { defineConfig, devices } from "@playwright/test";

const testDatabase = process.env.TEST_DATABASE_URL;
if (testDatabase) {
  const target = new URL(testDatabase);
  if (target.hostname !== "127.0.0.1" || target.port !== "55439")
    throw new Error(
      "Browser integration tests require the isolated local PostgreSQL instance on port 55439.",
    );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !testDatabase && !process.env.CI,
    env: {
      SCHOLARSHIP_E2E: "1",
      ...(testDatabase
        ? {
            DATABASE_URL: testDatabase,
            AUTH_URL: "http://127.0.0.1:3100",
            AUTH_SECRET:
              "isolated-browser-fixture-secret-not-for-production-12345",
            AUTH_GITHUB_ID: "fixture-client",
            AUTH_GITHUB_SECRET: "fixture-secret",
            OWNER_GITHUB_ID: "132573008",
            DISCOVERY_SEARCH_PROVIDER: "mock",
          }
        : {}),
    },
  },
});
