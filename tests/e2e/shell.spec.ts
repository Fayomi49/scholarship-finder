import { expect, test } from "@playwright/test";

test("visitors can navigate to the honest empty directory", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Scholarship Finder");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Explore scholarships" })
    .click();
  await expect(page).toHaveURL(/\/scholarships$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Explore scholarships",
  );
  await expect(
    page.getByRole("heading", { name: "The directory is taking shape" }),
  ).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBe(true);
});

test("keyboard users can skip navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
