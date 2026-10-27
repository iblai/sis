import { test, expect } from "@playwright/test";
import { ADMIN, STUDENT, open, pickCourse, pickUser, seeded, toast } from "../helpers";

/**
 * Students journey — the directory and the e2e student's record. Only the
 * e2e student is ever written to; the invitation (C2) and the CSV import (ST4)
 * leave an @example.com invitation and account behind on the throwaway platform.
 */
const stamp = Date.now().toString(36);
const seed = seeded();

test.describe("students journey", () => {
  test("ST1 · search finds the e2e student, the row opens the record, nonsense finds nothing", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, "/students", /^Students\b/);
    const search = page.getByLabel("Search", { exact: true });
    await search.fill(STUDENT);
    const link = page.getByRole("row").getByRole("link").first();
    await expect(link).toHaveAttribute("href", new RegExp(`/students/${STUDENT}$`), {
      timeout: 15_000,
    });
    await link.click();
    await page.waitForURL((url) => url.pathname.endsWith(`/students/${STUDENT}`), {
      timeout: 15_000,
    });
    await open(page, "/students", /^Students\b/);
    await search.fill(`zz-nobody-${stamp}`);
    await expect(page.getByText("No student matches")).toBeVisible({ timeout: 15_000 });
  });

  test("ST2 · Invite Student opens the invite dialog on ?invite=1 and closing returns to the list", async ({
    page,
  }) => {
    await open(page, "/students", /^Students\b/);
    await page.getByRole("button", { name: "Invite Student", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("invite") === "1", { timeout: 15_000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("textbox").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForURL((url) => !url.searchParams.has("invite"), { timeout: 15_000 });
    await expect(dialog).toHaveCount(0);
  });

  test("C2 · an invitation is sent and the pending banner lists it", async ({ page }) => {
    await open(page, "/students", /^Students\b/);
    const banner = page.getByRole("button", { name: /pending invitation/ });
    const before = (await banner.count())
      ? Number((await banner.textContent())!.match(/(\d+) pending/)![1])
      : 0;
    await open(page, "/students?invite=1", { dialog: /invite/i });
    const dialog = page.getByRole("dialog");
    const email = `e2e-inv-${stamp}@example.com`;
    await dialog.getByRole("textbox").first().fill(email);
    await dialog
      .getByRole("button", { name: /invite|send/i })
      .first()
      .click();
    await expect(dialog.getByText(email)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
    await open(page, "/students", /^Students\b/);
    await expect(banner).toContainText(`${before + 1} pending invitation`, { timeout: 30_000 });
    await banner.click();
    await expect(page.getByRole("dialog").getByText(email)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
  });

  test("ST3 · Import CSV previews the rows it can read and the ones it cannot", async ({
    page,
  }) => {
    await open(page, "/students?import=1", { dialog: "Import Students" });
    const dialog = page.getByRole("dialog", { name: "Import Students" });
    const csv = dialog.locator("#import-csv");
    await csv.fill(
      `email,username,name,country\nok-${stamp}@example.com,ok-${stamp},Ok ${stamp},US`,
    );
    await expect(dialog.getByText("1 row ready, 0 with errors")).toBeVisible();
    await csv.fill("not-an-email,,,");
    await expect(dialog.getByText("0 rows ready, 1 with errors")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL((url) => !url.searchParams.has("import"), { timeout: 15_000 });
  });

  test("ST4 · one CSV row is imported into the seeded course", async ({ page }) => {
    test.skip(!seed, "run the setup project first");
    test.setTimeout(180_000);
    await open(page, "/students?import=1", { dialog: "Import Students" });
    const dialog = page.getByRole("dialog", { name: "Import Students" });
    await pickCourse(page, dialog.locator("#import-section"), seed!.courseName);
    await dialog
      .locator("#import-csv")
      .fill(`e2e-imp-${stamp}@example.com,e2e-imp-${stamp},E2E Import ${stamp},US`);
    await dialog.getByRole("button", { name: "Import 1 Student" }).click();
    // The learning platform's import needs ALLOW_AUTOMATED_SIGNUPS and course staff: a refusal skips.
    const done = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "1 student imported, 0 refused" });
    const refused = page.locator("[data-sonner-toast]").filter({ hasText: /permission/i });
    await expect(done.or(refused).first()).toBeVisible({ timeout: 60_000 });
    test.skip(
      (await refused.count()) > 0,
      "the learning platform refuses the CSV import for this course (ALLOW_AUTOMATED_SIGNUPS or course staff)",
    );
  });

  test("ST5 · the record page has six tabs, ?tab= follows them, and the breadcrumbs lead back", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}`);
    for (const tab of ["Overview", "Record", "Enrollment", "Grades", "Credentials", "Guardians"]) {
      await expect(page.getByRole("tab", { name: tab, exact: true })).toBeVisible();
    }
    await page.getByRole("tab", { name: "Grades", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("tab") === "grades", { timeout: 15_000 });
    await expect(page.getByRole("tab", { name: "Grades", selected: true })).toBeVisible();
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Students" })).toBeVisible();
  });

  test("ST6 · Overview shows the membership status and the two summary cards", async ({ page }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}`);
    const summary = page.locator("section").filter({ hasText: "Summary" });
    await expect(summary.getByText("Active", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Courses and Contacts" })).toBeVisible();
    await expect(summary.getByText("Student ID")).toBeVisible();
  });

  test("ST7 · a school record field saves, survives a reload and is restored", async ({ page }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}?tab=record`);
    const homeroom = page.locator("#custom-homeroom");
    const before = await homeroom.inputValue();
    try {
      await homeroom.fill(`Room ${stamp}`);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Record saved");
      await page.reload();
      await expect(homeroom).toHaveValue(`Room ${stamp}`, { timeout: 30_000 });
    } finally {
      await homeroom.fill(before);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Record saved");
    }
  });

  test("C9 · a personal field saves through its select", async ({ page }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}?tab=record`);
    await page.getByLabel("Primary Language").click();
    await page.getByRole("listbox").getByRole("option", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await toast(page, "Record saved");
    await page.reload();
    await expect(page.getByLabel("Primary Language")).toContainText("English", { timeout: 30_000 });
  });

  test("ST8 · Enrollment lists the seeded course as Enrolled and Drop is a link-out", async ({
    page,
  }) => {
    test.skip(!STUDENT || !seed, "needs the student account and the seed");
    await open(page, `/students/${STUDENT}?tab=enrollment`);
    const row = page.getByRole("row").filter({ hasText: seed!.courseName });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText("Enrolled", { exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: "Drop" })).toHaveAttribute(
      "href",
      /\/instructor#view-membership$/,
    );
  });

  test("ST9 · Grades shows the term GPA and the course row across all terms", async ({ page }) => {
    test.skip(!STUDENT || !seed, "needs the student account and the seed");
    await open(page, `/students/${STUDENT}?tab=grades`);
    await page.getByRole("combobox", { name: "Term" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "All Terms" }).click();
    await expect(page.getByText("Term GPA")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: seed!.courseName });
    await expect(row).toBeVisible({ timeout: 30_000 });
    const details = row.getByRole("button", { name: "Details" });
    await details.click();
    await expect(details).toHaveAttribute("aria-expanded", "true");
  });

  test("ST10 · a guardian is added from the directory and removed again", async ({ page }) => {
    test.skip(!STUDENT || !ADMIN, "needs both test accounts");
    await open(page, `/students/${STUDENT}?tab=guardians`);
    await pickUser(page, page.getByRole("button", { name: "Pick the guardian’s account" }), ADMIN);
    await page.getByRole("button", { name: "Add Guardian" }).click();
    await toast(page, "Guardian added");
    const entry = page.getByRole("listitem").filter({ hasText: ADMIN });
    await expect(entry).toBeVisible({ timeout: 15_000 });
    await entry.getByRole("button", { name: "Remove Guardian" }).click();
    await toast(page, "Guardian removed");
    await expect(page.getByText("No guardians yet.")).toBeVisible({ timeout: 15_000 });
  });

  test("ST11 · the Issue Credential dialog opens with its three fields and cancels", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}?tab=credentials`);
    await page.getByRole("button", { name: "Issue Credential" }).click();
    const dialog = page.getByRole("dialog", { name: "Issue a Credential" });
    await expect(dialog.getByLabel("Credential")).toBeVisible();
    await expect(dialog.locator("#credential-course")).toBeVisible();
    await expect(dialog.locator("#issue-narrative")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("ST12 · Deactivate confirms, deactivates the membership, and Reactivate undoes it", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${STUDENT}`);
    try {
      await page.getByRole("button", { name: "Deactivate", exact: true }).click();
      const confirm = page.getByRole("alertdialog", { name: "Deactivate this membership?" });
      await confirm.getByRole("button", { name: "Deactivate" }).click();
      await toast(page, "Membership deactivated");
      await expect(page.getByRole("button", { name: "Reactivate", exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      const reactivate = page.getByRole("button", { name: "Reactivate", exact: true });
      if (await reactivate.isVisible()) {
        await reactivate.click();
        await toast(page, "Membership reactivated");
      }
    }
  });

  test("ST13 · the pagination bar counts the first page and cannot go back from it", async ({
    page,
  }) => {
    await open(page, "/students", /^Students\b/);
    await expect(page.getByText(/^1–\d+ of \d+ students$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  });
});
