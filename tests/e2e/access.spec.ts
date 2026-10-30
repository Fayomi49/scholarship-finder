import { test, expect } from "@playwright/test";

test("dashboard requires personal sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: "Your personal scholarship workspace" }),
  ).toBeVisible();
});
test("direct owner-only endpoints reject anonymous requests", async ({
  request,
}) => {
  for (const path of [
    "/api/discovery/runs",
    "/api/discovery/runs/nonexistent",
  ]) {
    const response = await request.get(path);
    expect([401, 503]).toContain(response.status());
  }
  for (const path of ["/api/discovery/runs", "/api/discovery/review"]) {
    const response = await request.post(path, {
      headers: { origin: "http://127.0.0.1:3100" },
      data: {},
    });
    expect([401, 503]).toContain(response.status());
  }
  const profile = await request.put("/api/profile", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect([401, 503]).toContain(profile.status());
});
