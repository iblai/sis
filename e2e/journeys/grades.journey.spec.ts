import { test, expect } from "@playwright/test";
import { STUDENT, open, seeded, toast } from "../helpers";

/** Grades journey — class averages per course and the term report per grade level. */
const seed = seeded();

test.describe("grades journey", () => {
  test("GR1 · the Courses table links each course to its gradebook across all terms", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/grades", /^Grades\b/);
    await page.getByRole("combobox", { name: "Term" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "All Terms" }).click();
    const row = page.getByRole("row").filter({ hasText: seed!.courseName }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByRole("link").first()).toHaveAttribute("href", /\?tab=gradebook$/);
  });

  test("GR2 · the seeded grade level shows its term report with the e2e student", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    await open(page, "/grades", /^Grades\b/);
    // The report needs a term; the seeded one holds no course, which is fine for the roster.
    await page.getByRole("combobox", { name: "Term" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Term", exact: true }).click();
    await page.getByRole("combobox", { name: "Grade Level" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Grade", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /^Term Report · E2E Grade cohort/ }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: new RegExp(STUDENT) })).toHaveAttribute(
      "href",
      /\?tab=grades$/,
    );
  });

  test("GR3 · Course Grade Report starts the report and points at Reports", async ({ page }) => {
    await open(page, "/grades", /^Grades\b/);
    await page.getByRole("button", { name: "Course Grade Report" }).click();
    await toast(page, "The course grade report is running — find it under Reports");
  });

  test("GR4 · the All Platforms switch toggles and the table still renders", async ({ page }) => {
    await open(page, "/grades", /^Grades\b/);
    const all = page.getByRole("switch", { name: "All Platforms" });
    await all.click();
    await expect(all).toBeChecked();
    await expect(page.getByRole("heading", { name: /^Courses\b/ })).toBeVisible();
  });
});
