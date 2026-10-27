import { test, expect, type Page } from "@playwright/test";
import { open, ready, toast } from "../helpers";

/**
 * Setup journey — the school's own data in the platform metadata (`sis`
 * block, arrays written whole) and the student field definitions. Every row a
 * test adds is removed again in the same test; the baseline rows ("E2E Year",
 * "E2E Term", "E2E Grade") are the seed's and never touched.
 */
const stamp = Date.now().toString(36);
const CONFLICT = "Someone else changed this list meanwhile — reload and try again.";

/** A list editor section of a Setup tab, by its heading. */
const section = (page: Page, heading: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });

/** The row whose named input holds `value`. */
const rowWith = (page: Page, value: string) =>
  page.getByRole("row").filter({ has: page.locator(`input[value="${value}"]`) });

/** Add a row to a list editor, fill it, save, prove it survived a reload, remove it, save. */
async function roundTrip(
  page: Page,
  tab: string,
  fill: (scope: Page) => Promise<void>,
  value: string,
) {
  await open(page, `/setup?tab=${tab}`, /^Setup\b/);
  await page.getByRole("button", { name: "Add Row" }).click();
  await fill(page);
  await page.getByRole("button", { name: "Save" }).click();
  await toast(page, "Saved");
  await page.reload();
  await ready(page, /^Setup\b/);
  const row = rowWith(page, value);
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await toast(page, "Saved");
}

test.describe("setup journey", () => {
  test("C1 · Setup adds a school year, keeps it, and removes it again", async ({ page }) => {
    await open(page, "/setup?tab=terms", /^Setup\b/);
    const years = section(page, "School Years");
    await years.getByRole("button", { name: "Add Row" }).click();
    await years.getByLabel("Year").last().fill(`Year ${stamp}`);
    await years.getByLabel("Start", { exact: true }).last().fill("2026-09-01");
    await years.getByLabel("End", { exact: true }).last().fill("2027-06-30");
    await years.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
    await page.reload();
    await ready(page, /^Setup\b/);
    const row = rowWith(page, `Year ${stamp}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Remove" }).click();
    await years.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
  });

  test("SU1 · the seven tabs open from ?tab= and the tab list never widens the page", async ({
    page,
  }) => {
    for (const [key, label] of [
      ["school", "School"],
      ["terms", "Year & Terms"],
      ["levels", "Grade Levels"],
      ["periods", "Periods"],
      ["rooms", "Rooms"],
      ["subjects", "Subjects"],
      ["fields", "Student Fields"],
    ] as const) {
      await open(page, key === "school" ? "/setup" : `/setup?tab=${key}`, /^Setup\b/);
      await expect(page.getByRole("tab", { name: label, selected: true })).toBeVisible();
      const [scroll, client] = await page
        .getByRole("tablist")
        .evaluate((el) => [el.scrollWidth, document.documentElement.clientWidth]);
      expect(scroll, `${label}: the tab list is wider than the page`).toBeLessThanOrEqual(client);
    }
  });

  test("SU2 · School saves the address, phone and time zone, keeps them, and gets them back", async ({
    page,
  }) => {
    await open(page, "/setup", /^Setup\b/);
    const fields = ["address", "phone", "timezone"] as const;
    const before: Record<string, string> = {};
    for (const f of fields) before[f] = await page.locator(`#school-${f}`).inputValue();
    try {
      for (const f of fields) await page.locator(`#school-${f}`).fill(`E2E ${f} ${stamp}`);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Saved");
      await page.reload();
      await ready(page, /^Setup\b/);
      for (const f of fields) {
        await expect(page.locator(`#school-${f}`)).toHaveValue(`E2E ${f} ${stamp}`);
      }
    } finally {
      for (const f of fields) await page.locator(`#school-${f}`).fill(before[f]);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await toast(page, "Saved");
    }
  });

  test("SU3 · a term under the seeded year saves, survives a reload and is removed again", async ({
    page,
  }) => {
    await open(page, "/setup?tab=terms", /^Setup\b/);
    const terms = section(page, "Terms");
    await terms.getByRole("button", { name: "Add Row" }).click();
    await terms.getByLabel("Term").last().fill(`Term ${stamp}`);
    await terms.getByRole("combobox", { name: "Year" }).last().click();
    await page.getByRole("listbox").getByRole("option", { name: "E2E Year", exact: true }).click();
    await terms.getByLabel("Start", { exact: true }).last().fill("2099-07-01");
    await terms.getByLabel("End", { exact: true }).last().fill("2099-08-31");
    await terms.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
    await page.reload();
    await ready(page, /^Setup\b/);
    const row = rowWith(page, `Term ${stamp}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("combobox", { name: "Year" })).toContainText("E2E Year");
    await row.getByRole("button", { name: "Remove" }).click();
    await terms.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
  });

  test("SU4 · a grade level gets a cohort group, saves linked, and both are removed again", async ({
    page,
  }) => {
    await open(page, "/setup?tab=levels", /^Setup\b/);
    await page.getByRole("button", { name: "Add Row" }).click();
    await page.getByLabel("Level").last().fill(`Level ${stamp}`);
    await page.getByLabel("Order").last().fill("999");
    const row = rowWith(page, `Level ${stamp}`);
    await row.getByRole("button", { name: "Create Cohort Group" }).click();
    await toast(page, `Group “Level ${stamp} cohort” created`);
    await page.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
    await page.reload();
    await ready(page, /^Setup\b/);
    const linked = await row.getByText(/Group #\d+/).textContent({ timeout: 15_000 });
    const groupId = linked!.match(/#(\d+)/)![1];
    await row.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await toast(page, "Saved");
    // The cohort group is a DM user group of its own: delete it too.
    await open(page, `/groups/${groupId}`, new RegExp(`^Level ${stamp} cohort\\b`));
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await toast(page, "Group deleted");
    await page.waitForURL((url) => /\/groups\/?$/.test(url.pathname), { timeout: 15_000 });
  });

  test("SU5 · a period saves, survives a reload and is removed again", async ({ page }) => {
    await roundTrip(
      page,
      "periods",
      async (p) => {
        await p.getByLabel("Period").last().fill(`Period ${stamp}`);
        await p.getByLabel("Starts").last().fill("08:00");
        await p.getByLabel("Ends").last().fill("08:45");
      },
      `Period ${stamp}`,
    );
  });

  test("SU6 · a room saves, survives a reload and is removed again", async ({ page }) => {
    await roundTrip(
      page,
      "rooms",
      async (p) => {
        await p.getByLabel("Room").last().fill(`Room ${stamp}`);
        await p.getByLabel("Capacity").last().fill("30");
      },
      `Room ${stamp}`,
    );
  });

  test("SU7 · a subject saves, survives a reload and is removed again", async ({ page }) => {
    await roundTrip(
      page,
      "subjects",
      async (p) => {
        await p.getByLabel("Subject").last().fill(`Subject ${stamp}`);
      },
      `Subject ${stamp}`,
    );
  });

  test("SU8 · Seed Defaults is idempotent after the seed and Student ID is listed", async ({
    page,
  }) => {
    await open(page, "/setup?tab=fields", /^Setup\b/);
    await page.getByRole("button", { name: "Seed Defaults" }).click();
    await toast(page, "Every default field already exists");
    await expect(page.getByRole("cell", { name: "Student ID", exact: true })).toBeVisible();
  });

  test("SU9 · a select field with choices is added, listed, and deleted again", async ({
    page,
  }) => {
    await open(page, "/setup?tab=fields", /^Setup\b/);
    const form = page.locator("form");
    await form.getByLabel("Name", { exact: true }).fill(`Bus Route ${stamp}`);
    await form.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "select", exact: true }).click();
    await form.getByLabel("Choices").fill("North, South");
    await form.getByRole("button", { name: "Add Field" }).click();
    await toast(page, `Field “Bus Route ${stamp}” added`);
    const row = page.getByRole("row").filter({ hasText: `Bus Route ${stamp}` });
    await expect(row).toContainText("North, South");
    await expect(row.getByRole("checkbox", { name: "Required" })).not.toBeChecked();
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await toast(page, "Field deleted");
    await expect(row).toHaveCount(0);
  });

  test("SU10 · Export downloads the field definitions as student-fields.csv", async ({ page }) => {
    await open(page, "/setup?tab=fields", /^Setup\b/);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("student-fields.csv");
  });

  test("SU11 · Save stays disabled until a list is dirty and every required cell is filled", async ({
    page,
  }) => {
    await open(page, "/setup?tab=subjects", /^Setup\b/);
    const save = page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Add Row" }).click();
    await expect(save).toBeDisabled();
    await page.getByLabel("Subject").last().fill(`Subject ${stamp}`);
    await expect(save).toBeEnabled();
    await page.getByLabel("Subject").last().fill("");
    await expect(save).toBeDisabled();
    await page.getByRole("row").last().getByRole("button", { name: "Remove" }).click();
    await expect(save).toBeDisabled();
  });

  test("SU12 · a list changed meanwhile refuses the stale save and shows the other change", async ({
    page,
    context,
  }) => {
    const other = await context.newPage();
    await open(page, "/setup?tab=rooms", /^Setup\b/);
    await open(other, "/setup?tab=rooms", /^Setup\b/);
    try {
      await page.getByRole("button", { name: "Add Row" }).click();
      await page.getByLabel("Room").last().fill(`Room A ${stamp}`);
      await page.getByRole("button", { name: "Save" }).click();
      await toast(page, "Saved");
      await other.getByRole("button", { name: "Add Row" }).click();
      await other.getByLabel("Room").last().fill(`Room B ${stamp}`);
      await other.getByRole("button", { name: "Save" }).click();
      await toast(other, CONFLICT);
      await other.reload();
      await ready(other, /^Setup\b/);
      await expect(rowWith(other, `Room A ${stamp}`)).toBeVisible({ timeout: 15_000 });
      await expect(rowWith(other, `Room B ${stamp}`)).toHaveCount(0);
    } finally {
      await other.close();
      await page.reload();
      await ready(page, /^Setup\b/);
      const row = rowWith(page, `Room A ${stamp}`);
      if (await row.count()) {
        await row.getByRole("button", { name: "Remove" }).click();
        await page.getByRole("button", { name: "Save" }).click();
        await toast(page, "Saved");
      }
    }
  });
});
