import { test, expect } from "@playwright/test";
import { ADMIN, STUDENT, appHost, open, openProfileMenu, platformOf, seeded } from "../helpers";

/**
 * Member journey — what a student sees: home with their courses and
 * credentials, the Courses list and their own record; every admin surface
 * sends them home. Signed in as the student test account (auth.setup.ts,
 * "authenticate the member"); skips until pnpm e2e:accounts has created it.
 */
const seed = seeded();

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

test.describe("member journey", () => {
  test("M1 · a student's home shows their courses and credentials, never an admin row", async ({
    page,
  }) => {
    await open(page, "", /^Home\b/);
    await expect(page.getByText("My Courses", { exact: true })).toBeVisible();
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
    await open(page, "", /^Home\b/);
    const home = `/platform/${encodeURIComponent(platformOf(page))}`;
    await page.getByRole("button", { name: "Details", exact: true }).first().click();
    await page.waitForURL(
      (url) => url.pathname === `${home}/students/${encodeURIComponent(STUDENT)}`,
      { timeout: 15_000 },
    );
    await expect(page.getByRole("tab", { name: /record/i })).toBeVisible({ timeout: 30_000 });
  });

  test("M3 · the admin lists and Setup send a student home", async ({ page }) => {
    await open(page, "", /^Home\b/);
    const home = `/platform/${encodeURIComponent(platformOf(page))}`;
    for (const path of ["/students", "/setup"]) {
      await page.goto(`${appHost}${home}${path}`);
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === home, {
        timeout: 15_000,
      });
    }
  });

  test("M4 · Courses lists the seeded course with its term, grade and progress, and opens it", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/courses", /^Courses\b/);
    await expect(page.getByText("The courses you are enrolled in")).toBeVisible();
    for (const column of ["Course", "Term", "Grade", "Progress"]) {
      await expect(page.getByRole("columnheader", { name: column })).toBeVisible();
    }
    const link = page.getByRole("link", { name: seed!.courseName }).first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.click();
    await page.waitForURL((url) => url.pathname.includes("/courses/"), { timeout: 30_000 });
  });

  test("M5 · the student's course page shows their standing and graded work, with no admin tabs", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, `/courses/${encodeURIComponent(seed!.courseId)}`);
    await expect(page.getByRole("heading", { name: "My Standing" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Graded Work" })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Instructor Dashboard" })).toHaveCount(0);
    const lms = page.getByRole("button", { name: "Open in the Learning Platform" });
    await expect(lms).toHaveAttribute("href", /app=skills/);
    await expect(lms).toHaveAttribute("href", /tenant=/);
  });

  test("M6 · the student's own record is read-only: no Save, no Guardians, no Deactivate", async ({
    page,
  }) => {
    await open(page, `/students/${encodeURIComponent(STUDENT)}?tab=record`);
    await expect(page.locator("fieldset[disabled]").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Guardians" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("M7 · the profile menu has no Account item and ⌘K offers only the member's pages", async ({
    page,
  }) => {
    await open(page, "/courses", /^Courses\b/);
    const menu = await openProfileMenu(page);
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Account" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    const dialog = page.getByRole("dialog");
    for (const row of ["Home", "Courses", "Details"]) {
      await expect(dialog.getByRole("option", { name: row, exact: true })).toBeVisible();
    }
    await expect(dialog.getByRole("option", { name: "New Group" })).toHaveCount(0);
    await expect(dialog.getByRole("option", { name: "Setup", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("M8 · every admin list and another member's record send the student home", async ({
    page,
  }) => {
    await open(page, "/courses", /^Courses\b/);
    const home = `/platform/${encodeURIComponent(platformOf(page))}`;
    const paths = ["/staff", "/groups", "/grades", "/credentials", "/reports", "/messages"];
    if (ADMIN) paths.push(`/students/${encodeURIComponent(ADMIN)}`);
    for (const path of paths) {
      await page.goto(`${appHost}${home}${path}`);
      await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === home, {
        timeout: 15_000,
      });
    }
  });

  test("M9 · the student's notifications page renders the inbox", async ({ page }) => {
    await open(page, "/notifications", /^Notifications\b/);
    await expect(
      page
        .getByTestId("notification-inbox-tab")
        .or(page.getByRole("tab", { name: /inbox/i }))
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
