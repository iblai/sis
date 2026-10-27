import { test, expect, type Page } from "@playwright/test";
import { ADMIN, STUDENT, open, pickCourse, pickUser, ready, seeded, toast } from "../helpers";

/**
 * Courses journey — the platform's course runs and the seeded course's
 * Roster, Gradebook and Settings tabs. CO11 reruns the course in Studio and
 * leaves that run behind on the throwaway platform (allowed by rei).
 */
const stamp = Date.now().toString(36);
const seed = seeded();
const coursePath = (tab?: string) =>
  `/courses/${encodeURIComponent(seed!.courseId)}${tab ? `?tab=${tab}` : ""}`;
/** A Settings card, by its heading. */
const card = (page: Page, title: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: new RegExp(`^${title}\\b`) }) });

test.describe("courses journey", () => {
  test("C3 · the Courses list shows the platform's runs", async ({ page }) => {
    await open(page, "/courses", /^Courses\b/);
    await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 30_000 });
  });

  test("CO1 · search narrows the list to the seeded course and nonsense finds nothing", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/courses", /^Courses\b/);
    const search = page.getByLabel("Search", { exact: true });
    await search.fill(seed!.courseName);
    await expect(page.getByRole("row").filter({ hasText: seed!.courseName }).first()).toBeVisible();
    await search.fill(`zz-nothing-${stamp}`);
    await expect(page.getByText("No course matches")).toBeVisible();
  });

  test("CO2 · the term and grade-level filters narrow the list and All Platforms toggles", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/courses", /^Courses\b/);
    await page.getByRole("combobox", { name: "Term" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Term", exact: true }).click();
    // Only the runs filed under the seeded term stay (CO11's reruns), or the empty state.
    const rows = page.locator("tbody tr");
    await expect(page.getByText("No course matches").or(rows.first())).toBeVisible();
    for (const row of await rows.all())
      await expect(row.getByRole("cell").nth(1)).toHaveText("E2E Term");
    await page.getByRole("combobox", { name: "Term" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "All Terms" }).click();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Grade Level" })).toBeVisible();
    const all = page.getByRole("switch", { name: "All Platforms" });
    await all.click();
    await expect(all).toBeChecked();
    await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 30_000 });
  });

  test("C4 · the course page opens on the roster and Settings names the teachers", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, coursePath());
    await expect(page.getByRole("tab", { name: "Roster", selected: true })).toBeVisible();
    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page.getByRole("tab", { name: "Settings", selected: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Teachers\b/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("CO3 · the header links to the learning platform signed in and to the instructor dashboard", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, coursePath());
    const lms = page.getByRole("button", { name: "Open in the Learning Platform" });
    const href = (await lms.getAttribute("href"))!;
    expect(href).toContain("app=skills");
    expect(href).toContain("redirect-to=");
    expect(href).toContain("tenant=");
    await expect(page.getByRole("link", { name: "Instructor Dashboard" })).toHaveAttribute(
      "href",
      /\/instructor$/,
    );
  });

  test("CO4 · the roster lists the e2e student, searches, exports a CSV and links to the course email", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    await open(page, coursePath());
    const row = page.getByRole("row").filter({ hasText: STUDENT });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("link").first()).toHaveAttribute(
      "href",
      new RegExp(`/students/${STUDENT}$`),
    );
    const search = page.getByLabel("Search", { exact: true });
    await search.fill(`zz-nobody-${stamp}`);
    await expect(page.getByText("No learner matches")).toBeVisible();
    await search.fill("");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(/^roster-.*\.csv$/);
    await expect(page.getByRole("button", { name: "Email the Roster" })).toHaveAttribute(
      "href",
      new RegExp(`/messages\\?course=${encodeURIComponent(seed!.courseId)}`),
    );
  });

  test("CO5 · the gradebook grid lists the learner, filters, and opens the embedded gradebook", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    await open(page, coursePath("gradebook"));
    test.skip(
      await page.getByText("Gradebook API not enabled").isVisible(),
      "the gradebook API flag is off on this platform",
    );
    const row = page.getByRole("row").filter({ hasText: STUDENT });
    await expect(row).toBeVisible({ timeout: 30_000 });
    const search = page.getByPlaceholder("Find a learner…");
    await search.fill(`zz-nobody-${stamp}`);
    await expect(page.getByText("No learner matches")).toBeVisible({ timeout: 15_000 });
    await search.fill("");
    await page.getByRole("button", { name: "Open in Gradebook" }).click();
    const dialog = page.getByRole("dialog", { name: "Gradebook" });
    await expect(dialog.locator("iframe")).toHaveAttribute("src", /\/gradebook\//);
    await page.keyboard.press("Escape");
  });

  test("C5 · a score is overridden with a reason, History gains the entry, and the score is set back", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    test.setTimeout(240_000);
    await open(page, coursePath("gradebook"));
    test.skip(
      await page.getByText("Gradebook API not enabled").isVisible(),
      "the gradebook API flag is off on this platform",
    );
    const row = page.getByRole("row").filter({ hasText: STUDENT });
    await expect(row).toBeVisible({ timeout: 30_000 });
    const cell = () => row.getByRole("button", { name: / · / }).first();
    test.skip((await cell().count()) === 0, "the seeded course has no graded subsection");
    const entries = () => page.getByRole("list").last().getByRole("listitem");
    // The history before, so the new entry is counted, not guessed: the list shows score, time and user.
    await cell().click();
    await page.getByRole("button", { name: "History" }).click();
    await expect(page.getByText("No overrides yet.").or(entries().first())).toBeVisible({
      timeout: 15_000,
    });
    const before = await entries().count();
    const earned = page.locator("#grade-earned");
    const possible = page.locator("#grade-possible");
    const earnedBefore = await earned.inputValue();
    // An unattempted cell reads 0 of 0 and the editor refuses a possible of 0.
    if (!(Number(await possible.inputValue()) > 0)) await possible.fill("10");
    const next = earnedBefore === "1" ? "2" : "1";
    await earned.fill(next);
    await page.locator("#grade-comment").fill(`e2e override ${stamp}`);
    // The bulk update answers per item whether the override was applied; the app toasts regardless.
    const accepted = page.waitForResponse(
      (res) => res.url().includes("/gradebook/") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await toast(page, "Grade saved");
    const items = (await (await accepted).json().catch(() => [])) as {
      success?: boolean;
      reason?: string;
    }[];
    const item = Array.isArray(items) ? items[0] : undefined;
    test.skip(
      item?.success === false,
      `the learning platform did not apply the override: ${item?.reason ?? "no reason given"}`,
    );
    // The learning platform applies the override asynchronously: a fresh page reads the history.
    await expect(async () => {
      await page.reload();
      await ready(page);
      await cell().click();
      await page.getByRole("button", { name: "History" }).click();
      await expect(entries()).not.toHaveCount(before, { timeout: 10_000 });
      await expect(
        entries()
          .filter({ hasText: `${next}/` })
          .first(),
      ).toBeVisible();
    }).toPass({ timeout: 120_000, intervals: [5_000] });
    await earned.fill(earnedBefore || "0");
    await page.locator("#grade-comment").fill(`e2e restore ${stamp}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await toast(page, "Grade saved");
  });

  test("CO6 · Term and Dates fills the dates from a term and a reload discards the unsaved change", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, coursePath("settings"));
    const dates = card(page, "Term and Dates");
    for (const id of ["start", "end", "enrollStart", "enrollEnd"]) {
      await expect(dates.locator(`#dates-${id}`)).toBeVisible();
    }
    await expect(dates.locator("#dates-self-paced")).toBeVisible();
    const before = await dates.locator("#dates-start").inputValue();
    await dates.getByRole("combobox", { name: "Use a term’s dates…" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Term", exact: true }).click();
    await expect(dates.locator("#dates-start")).toHaveValue("2099-02-01");
    await page.reload();
    await expect(card(page, "Term and Dates").locator("#dates-start")).toHaveValue(before, {
      timeout: 30_000,
    });
  });

  test("CO7 · the Course card saves credits, the list shows them, and they are set back", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, coursePath("settings"));
    const course = card(page, "Course");
    const credits = course.locator("#section-credits");
    const before = await credits.inputValue();
    try {
      await credits.fill("3");
      await course.getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Saved");
      await open(page, "/courses", /^Courses\b/);
      const row = page.getByRole("row").filter({ hasText: seed!.courseName }).first();
      await expect(row.getByRole("cell").nth(5)).toContainText("3");
    } finally {
      await open(page, coursePath("settings"));
      await card(page, "Course").locator("#section-credits").fill(before);
      await card(page, "Course").getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Saved");
    }
  });

  test("CO8 · a teacher is added from the directory and removed again", async ({ page }) => {
    test.skip(!seed || !ADMIN, "needs the seed and the admin account");
    test.setTimeout(180_000);
    await open(page, coursePath("settings"));
    const teachers = card(page, "Teachers");
    const entry = teachers.getByRole("listitem").filter({ hasText: ADMIN });
    if (await entry.count()) {
      await entry.first().getByRole("button", { name: "Remove Teacher" }).click();
      await toast(page, "Teacher removed");
    }
    await pickUser(page, teachers.getByRole("button", { name: "Pick a staff member" }), ADMIN);
    await teachers.getByRole("button", { name: "Add Teacher" }).click();
    await toast(page, "Teacher added");
    await expect(entry.first()).toBeVisible({ timeout: 30_000 });
    await entry.first().getByRole("button", { name: "Remove Teacher" }).click();
    await toast(page, "Teacher removed");
    await expect(entry).toHaveCount(0, { timeout: 30_000 });
  });

  test("CO9 · the Grading Policy card renders the types, the weight total and the cutoffs; Add Type is undone by a reload", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, coursePath("settings"));
    const grading = card(page, "Grading Policy");
    await expect(grading.getByText("Assignment Type")).toBeVisible();
    await expect(grading.getByText(/Weights total \d+%/)).toBeVisible();
    await expect(grading.getByText("Letter Cutoffs")).toBeVisible();
    const rows = await grading.getByRole("row").count();
    await grading.getByRole("button", { name: "Add Type" }).click();
    await expect(grading.getByRole("row")).toHaveCount(rows + 1);
    await page.reload();
    await expect(card(page, "Grading Policy").getByRole("row")).toHaveCount(rows, {
      timeout: 30_000,
    });
  });

  test("CO10 · New Course derives the run id and the name from the source and the term before Create Course enables", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/courses?new=1", { dialog: "New Course" });
    const dialog = page.getByRole("dialog", { name: "New Course" });
    const create = dialog.getByRole("button", { name: "Create Course" });
    await expect(create).toBeDisabled();
    await pickCourse(page, dialog.locator("#section-source"), seed!.courseName);
    test.info().annotations.push({
      type: "after the source pick",
      description: `term=${await dialog.locator("#section-term").innerText()} run=${await dialog.locator("#section-run").inputValue()} name=${await dialog.locator("#section-name").inputValue()}`,
    });
    await dialog.locator("#section-term").click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Term", exact: true }).click();
    await expect(dialog.locator("#section-run")).toHaveValue("E2E_Term");
    await expect(dialog.locator("#section-name")).toHaveValue(`${seed!.courseName} (E2E Term)`);
    await expect(create).toBeEnabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL((url) => !url.searchParams.has("new"), { timeout: 15_000 });
  });

  test("CO11 · New Course reruns the seeded course into the seeded term and lands on the new run", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    test.setTimeout(300_000);
    await open(page, "/courses?new=1", { dialog: "New Course" });
    const dialog = page.getByRole("dialog", { name: "New Course" });
    await pickCourse(page, dialog.locator("#section-source"), seed!.courseName);
    await dialog.locator("#section-term").click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Term", exact: true }).click();
    await dialog.locator("#section-run").fill(`e2e_${stamp}`);
    await dialog.locator("#section-name").fill(`E2E ${stamp}`);
    await dialog.getByRole("button", { name: "Create Course" }).click();
    await toast(page, `Course “E2E ${stamp}” created`);
    await page.waitForURL((url) => url.pathname.includes(`e2e_${stamp}`), { timeout: 120_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(`^E2E ${stamp}\\b`) }),
    ).toBeVisible({ timeout: 120_000 });
  });
});
