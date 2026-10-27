import { test, expect, type Page } from "@playwright/test";

/**
 * Mobile journey — home and every admin page on a phone-sized viewport (the
 * `mobile` project). Requires auth.setup.ts and a platform admin on a
 * throwaway platform.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

const PAGES = [
  ["", "Home"],
  ["/students", "Students"],
  ["/staff", "Staff"],
  ["/courses", "Courses"],
  ["/groups", "Groups"],
  ["/grades", "Grades"],
  ["/credentials", "Credentials"],
  ["/reports", "Reports"],
  ["/messages", "Messages"],
] as const;

const SHEET = '[data-sidebar="sidebar"][data-mobile="true"]';

/**
 * Open the sidebar sheet and wait out its animation. Measured: right after a
 * sheet row navigated, the first toggle is swallowed and the second opens it.
 */
async function openSheet(page: Page) {
  const toggle = page.getByRole("button", { name: "Toggle Sidebar", exact: true });
  const settled = (sel: string) => {
    const el = document.querySelector(sel);
    return !!el && el.getAttribute("data-state") === "open" && el.getAnimations().length === 0;
  };
  await toggle.click();
  const opened = await page.waitForFunction(settled, SHEET, { timeout: 3_000 }).then(
    () => true,
    () => false,
  );
  if (opened) return;
  await toggle.click();
  await page.waitForFunction(settled, SHEET, { timeout: 10_000 });
}

/** The document is never wider than the phone: nothing scrolls sideways. */
async function expectNoSidewaysOverflow(page: Page) {
  await page.waitForLoadState("networkidle");
  const [scroll, client] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scroll, `${page.url()} is wider than the viewport`).toBeLessThanOrEqual(client);
}

test.describe("mobile journey", () => {
  test("S6 · a phone shows every admin page without sideways overflow", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto(appHost);
    await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
    const base = page.url().match(/^.*\/platform\/[^/?#]+/)![0];
    for (const [path, heading] of PAGES) {
      await page.goto(`${base}${path}`);
      await expect(
        page.getByRole("heading", { level: 1, name: new RegExp(`^${heading}\\b`) }),
      ).toBeVisible({
        timeout: 60_000,
      });
      await expectNoSidewaysOverflow(page);
    }
    // Setup needs Admin mode; on a phone the switch and the rows sit in the sidebar sheet.
    await openSheet(page);
    const adminSwitch = page.getByRole("switch", { name: /admin mode/i });
    await expect(adminSwitch).toBeVisible({ timeout: 15_000 });
    if (!(await adminSwitch.isChecked())) await adminSwitch.click();
    await page.getByRole("button", { name: "Setup", exact: true }).first().click();
    await page.waitForURL((url) => url.pathname.endsWith("/setup"), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: /^Setup\b/ })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoSidewaysOverflow(page);
    // The sheet reaches the lists too.
    await openSheet(page);
    await page.getByRole("button", { name: "Students", exact: true }).first().click();
    await page.waitForURL((url) => url.pathname.endsWith("/students"), { timeout: 15_000 });
    await expectNoSidewaysOverflow(page);
  });
});
