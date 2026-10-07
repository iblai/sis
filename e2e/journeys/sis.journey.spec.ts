import { test, expect } from "@playwright/test";

/**
 * SIS journey — the school's data on the throwaway platform: setup, a
 * student, a section, a roster, a group, a record field. Writes to the
 * platform's metadata and the LMS; run it on a throwaway platform only.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";
const stamp = Date.now().toString(36);

async function gotoHome(page: import("@playwright/test").Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

test.describe("sis journey", () => {
  test("C1 · Setup adds a term and keeps it", async ({ page }) => {
    const platform = await gotoHome(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/setup?tab=terms`);
    const sections = page.locator("section");
    const years = sections.first();
    await years.getByRole("button", { name: "Add row" }).click();
    await years.getByLabel("Year").last().fill(`Year ${stamp}`);
    await years.getByLabel("Start", { exact: true }).last().fill("2026-09-01");
    await years.getByLabel("End", { exact: true }).last().fill("2027-06-30");
    await years.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.locator(`input[value="Year ${stamp}"]`)).toBeVisible({ timeout: 15_000 });
  });

  test("C3 · the Courses list shows the platform's runs", async ({ page }) => {
    const platform = await gotoHome(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/courses`);
    await expect(page.getByRole("heading", { name: "Courses", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 30_000 });
  });

  test("C4 · a section's roster lists its learners and the settings name its teachers", async ({
    page,
  }) => {
    const platform = await gotoHome(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/courses`);
    await page.getByRole("row").nth(1).getByRole("link").first().click();
    await page.waitForURL((url) => /\/courses\/[^/]+/.test(url.pathname), { timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /roster/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("tab", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: "Teachers" })).toBeVisible({ timeout: 15_000 });
  });

  test("C6 · a group is created and a member added", async ({ page }) => {
    const platform = await gotoHome(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/groups?new=1`);
    await page.getByLabel("Name", { exact: true }).fill(`Homeroom ${stamp}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL((url) => /\/groups\/\d+/.test(url.pathname), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: `Homeroom ${stamp}` })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("C9 · a student's record saves a field", async ({ page }) => {
    const platform = await gotoHome(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/students`);
    const first = page.getByRole("row").nth(1).getByRole("link").first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    await first.click();
    await page.waitForURL((url) => /\/students\/[^/]+/.test(url.pathname), { timeout: 30_000 });
    await page.getByRole("tab", { name: /record/i }).click();
    const language = page.getByLabel("Primary language");
    await language.fill(`English ${stamp}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Record saved")).toBeVisible({ timeout: 15_000 });
  });
});
