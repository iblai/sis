import { test, expect, type Page } from "@playwright/test";
import { STUDENT, appHost, open, ready, seeded } from "../helpers";

/**
 * Mobile journey — home and every page on a phone-sized viewport (the
 * `mobile` project). Requires auth.setup.ts and a platform admin on a
 * throwaway platform; S27 runs as the student.
 */
const seed = seeded();
const stamp = Date.now().toString(36);

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
    await open(page, "/groups", /^Groups\b/);
    const base = page.url().match(/^.*\/platform\/[^/?#]+/)![0];
    for (const [path, heading] of PAGES) {
      await page.goto(`${base}${path}`);
      await ready(page, new RegExp(`^${heading}\\b`));
      await expectNoSidewaysOverflow(page);
    }
    // Setup needs Admin mode; on a phone the switch and the rows sit in the sidebar sheet.
    await openSheet(page);
    const adminSwitch = page.getByRole("switch", { name: /admin mode/i });
    await expect(adminSwitch).toBeVisible({ timeout: 15_000 });
    if (!(await adminSwitch.isChecked())) await adminSwitch.click();
    await page.getByRole("button", { name: "Setup", exact: true }).first().click();
    await page.waitForURL((url) => url.pathname.endsWith("/setup"), { timeout: 15_000 });
    await ready(page, /^Setup\b/);
    await expectNoSidewaysOverflow(page);
    // The sheet reaches the lists too.
    await openSheet(page);
    await page.getByRole("button", { name: "Students", exact: true }).first().click();
    await page.waitForURL((url) => url.pathname.endsWith("/students"), { timeout: 15_000 });
    await expectNoSidewaysOverflow(page);
  });

  test("S25 · a phone keeps the Admin switch and the language select in the sheet, out of the top bar", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const header = page.locator("header");
    await expect(header.getByRole("switch", { name: "Admin Mode" })).toBeHidden();
    await expect(header.getByRole("combobox", { name: "Language" })).toBeHidden();
    const [scroll, client] = await header.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client);
    await openSheet(page);
    const sheet = page.locator(SHEET);
    await expect(sheet.getByRole("switch", { name: "Admin Mode" })).toBeVisible();
    await expect(sheet.getByRole("combobox", { name: "Language" })).toBeVisible();
  });

  test("S28 · the setup flow and the platform preview fit a phone without sideways overflow", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await open(page, "/groups", /^Groups\b/);
    const base = page.url().match(/^.*\/platform\/[^/?#]+/)![0];
    await page.goto(`${base}/onboarding?flow=admin`);
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 60_000 });
    await expectNoSidewaysOverflow(page);
    await page.goto(`${appHost}/platform/e2e-nowhere-${stamp}`);
    await expect(page.getByTestId("organization-preview")).toBeVisible({ timeout: 60_000 });
    await expectNoSidewaysOverflow(page);
  });

  test("S26 · the student's record and the seeded course fit a phone with their tab rows", async ({
    page,
  }) => {
    test.skip(!STUDENT || !seed, "needs the student account and the seed");
    test.setTimeout(180_000);
    await open(page, `/students/${encodeURIComponent(STUDENT)}`);
    await expect(page.getByRole("tab")).toHaveCount(6);
    await expectNoSidewaysOverflow(page);
    await open(page, `/courses/${encodeURIComponent(seed!.courseId)}`);
    await expect(page.getByRole("tab")).toHaveCount(3);
    await expectNoSidewaysOverflow(page);
  });

  test.describe("as the student", () => {
    test.skip(
      !process.env.PLAYWRIGHT_MEMBER_USERNAME || !process.env.PLAYWRIGHT_MEMBER_PASSWORD,
      "no student account in e2e/.env.development (PLAYWRIGHT_MEMBER_*)",
    );
    test.use({ storageState: "playwright/.auth/member-chromium.json" });

    test("S27 · the student's home, Courses and Details fit a phone and the sheet lists their three rows", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await open(page, "", /^Home\b/);
      await expectNoSidewaysOverflow(page);
      await open(page, "/courses", /^Courses\b/);
      await expectNoSidewaysOverflow(page);
      await open(page, `/students/${encodeURIComponent(STUDENT)}`);
      await expectNoSidewaysOverflow(page);
      await openSheet(page);
      const sheet = page.locator(SHEET);
      for (const label of ["Home", "Courses", "Details"] as const) {
        await expect(sheet.getByRole("button", { name: label, exact: true })).toBeVisible();
      }
      await expect(sheet.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
    });
  });
});
