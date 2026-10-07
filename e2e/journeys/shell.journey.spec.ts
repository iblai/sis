import { test, expect } from "@playwright/test";

/**
 * Shell journey — sidebar navigation, ⌘K, the platform switcher, and the
 * admin gate. Requires auth.setup.ts and a platform admin on a throwaway platform.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

async function gotoHome(page: import("@playwright/test").Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

test.describe("shell journey", () => {
  test("S1 · the sidebar reaches every admin row", async ({ page }) => {
    const platform = await gotoHome(page);
    for (const [label, path] of [
      ["Students", "students"],
      ["Staff", "staff"],
      ["Courses", "courses"],
      ["Groups", "groups"],
      ["Attendance", "attendance"],
      ["Grades", "grades"],
      ["Credentials", "credentials"],
      ["Reports", "reports"],
      ["Messages", "messages"],
    ] as const) {
      // Sidebar rows are buttons (the SDK shell navigates on click).
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await page.waitForURL(
        (url) => url.pathname.endsWith(`/platform/${encodeURIComponent(platform)}/${path}`),
        {
          timeout: 15_000,
        },
      );
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test("S2 · ⌘K lists the groups and the create actions", async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await expect(page.getByPlaceholder(/search students, staff and courses/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Invite student")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("S3 · the profile menu names the current platform", async ({ page }) => {
    const platform = await gotoHome(page);
    // The SDK profile dropdown is the last control in the top bar.
    await page.locator("header").getByRole("button").last().click();
    const menu = page.locator('[role="menu"], [role="dialog"], [data-state="open"]').last();
    await expect(menu.getByText(new RegExp(platform, "i")).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.keyboard.press("Escape");
  });

  test("S4 · Setup is hidden outside Admin mode and /setup redirects home", async ({ page }) => {
    const platform = await gotoHome(page);
    await expect(page.getByRole("button", { name: "Setup", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("switch", { name: /admin mode/i }).click();
    await expect(page.getByRole("button", { name: "Setup", exact: true })).toHaveCount(0);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/setup`);
    await page.waitForURL(
      (url) =>
        url.pathname === `/platform/${encodeURIComponent(platform)}` ||
        url.pathname === `/platform/${encodeURIComponent(platform)}/`,
      { timeout: 15_000 },
    );
  });

  test("S5 · the home period select asks the overview for that window", async ({ page }) => {
    await gotoHome(page);
    const request = page.waitForRequest(
      (req) => req.url().includes("/api/overview/orgs/") && req.url().includes("start_date="),
      { timeout: 20_000 },
    );
    await page.getByRole("combobox", { name: /period/i }).click();
    await page.getByRole("option", { name: /last 7 days/i }).click();
    await request;
  });
});
