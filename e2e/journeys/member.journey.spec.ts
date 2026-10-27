import { test, expect, type Page } from "@playwright/test";

/**
 * Member journey — what a student sees: home with their courses and
 * credentials, the Courses list and their own record; every admin surface
 * sends them home. Signed in as the student test account (auth.setup.ts,
 * "authenticate the member"); skips until pnpm e2e:accounts has created it.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

test.skip(
  !process.env.PLAYWRIGHT_MEMBER_USERNAME || !process.env.PLAYWRIGHT_MEMBER_PASSWORD,
  "no student account in e2e/.env.development (PLAYWRIGHT_MEMBER_*): pnpm e2e:accounts creates one",
);
// The student's session, saved per browser by auth.setup.ts.
test.use({
  storageState: async ({ browserName }, use) => {
    await use(`playwright/.auth/member-${browserName}.json`);
  },
});

async function gotoHome(page: Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return `/platform/${encodeURIComponent(decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]))}`;
}

test.describe("member journey", () => {
  test("M1 · a student's home shows their courses and credentials, never an admin row", async ({
    page,
  }) => {
    await gotoHome(page);
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("My Courses", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("My Credentials", { exact: true })).toBeVisible();
    for (const label of ["Home", "Courses", "Details"] as const) {
      await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeVisible();
    }
    for (const label of ["Students", "Staff", "Setup"] as const) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole("switch", { name: /admin mode/i })).toHaveCount(0);
  });

  test("M2 · Details opens the student's own record", async ({ page }) => {
    const home = await gotoHome(page);
    const username: string = await page.evaluate(
      () => JSON.parse(localStorage.getItem("userData") ?? "{}").user_nicename ?? "",
    );
    expect(username).not.toBe("");
    await page.getByRole("button", { name: "Details", exact: true }).first().click();
    await page.waitForURL(
      (url) => url.pathname === `${home}/students/${encodeURIComponent(username)}`,
      { timeout: 15_000 },
    );
    await expect(page.getByRole("tab", { name: /record/i })).toBeVisible({ timeout: 30_000 });
  });

  test("M3 · the admin lists and Setup send a student home", async ({ page }) => {
    const home = await gotoHome(page);
    for (const path of ["/students", "/setup"]) {
      await page.goto(`${appHost}${home}${path}`);
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === home, {
        timeout: 15_000,
      });
    }
  });
});
