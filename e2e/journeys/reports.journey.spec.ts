import { test, expect } from "@playwright/test";
import { open, pickCourse, seeded, toast } from "../helpers";

/** Reports journey — the platform's reports (run, poll, download) and a course's instructor reports. */
const seed = seeded();

test.describe("reports journey", () => {
  test("R1 · the page lists the report cards with a status pill each, or says none are available", async ({
    page,
  }) => {
    await open(page, "/reports", /^Reports\b/);
    await expect(
      page
        .getByRole("button", { name: "Run", exact: true })
        .first()
        .or(page.getByText("No reports available.")),
    ).toBeVisible();
    if (await page.getByRole("button", { name: "Run", exact: true }).count()) {
      await expect(
        page.getByText(/^(Completed|Running|Pending|Failed|Expired)$/).first(),
      ).toBeVisible();
    }
  });

  test("R2 · Run starts a report: the toast names it and its card keeps a status pill", async ({
    page,
  }) => {
    await open(page, "/reports", /^Reports\b/);
    const run = page.getByRole("button", { name: "Run", exact: true }).first();
    test.skip((await run.count()) === 0, "no report is available on this platform");
    test.skip(await run.isDisabled(), "the first report is already running");
    await run.click();
    await toast(page, /is running/);
    // A small report completes within the second, so the pill may already read Completed again.
    await expect(page.getByText(/^(Running|Pending|Completed)/).first()).toBeVisible();
  });

  test("C7 · Download CSV of a completed report fires a download", async ({ page }) => {
    await open(page, "/reports", /^Reports\b/);
    const download = page.getByRole("button", { name: "Download CSV" }).first();
    test.skip((await download.count()) === 0, "no completed report on this platform yet");
    const event = page.waitForEvent("download");
    await download.click();
    expect((await event).suggestedFilename()).toMatch(/\.csv$/);
  });

  test("R3 · Course Reports requests the roster CSV for the seeded course", async ({ page }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/reports", /^Reports\b/);
    await pickCourse(page, page.getByRole("button", { name: "Pick a course" }), seed!.courseName);
    await page.getByRole("button", { name: "Request Roster CSV" }).click();
    await toast(page, "The roster CSV is being generated");
    await expect(page.getByText("Downloads", { exact: true })).toBeVisible();
  });
});
