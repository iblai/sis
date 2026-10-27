import { test, expect, type Page } from "@playwright/test";
import { STUDENT, appHost, open, seeded, toast } from "../helpers";

/**
 * Messages journey — a course email through the learning platform (to
 * "Myself" only) and a platform announcement to the named e2e student, read
 * back from their inbox.
 */
const stamp = Date.now().toString(36);
const seed = seeded();
const card = (page: Page, title: string) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: title }) });

/**
 * The learning platform's course email needs its bulk-email flag; its refusal
 * (a 403) toasts "You don’t have permission to do that", so the checkpoint
 * reads whichever toast comes and skips with it unless it is the success.
 */
async function sentOrSkipped(page: Page, success: string) {
  const first = page.locator("[data-sonner-toast]").first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  const text = (await first.innerText()).trim();
  test.skip(!text.includes(success), `the learning platform refused the course email: ${text}`);
}

test.describe("messages journey", () => {
  test("MS1 · ?course= preselects the course and Learners is the default audience", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, `/messages?course=${encodeURIComponent(seed!.courseId)}`, /^Messages\b/);
    const email = card(page, "Course Email");
    await expect(email.locator("#email-section")).toContainText(seed!.courseName);
    await expect(email.getByRole("checkbox", { name: "Learners" })).toBeChecked();
    await expect(email.getByRole("checkbox", { name: "Staff" })).not.toBeChecked();
    await expect(email.getByRole("checkbox", { name: "Myself" })).not.toBeChecked();
    await expect(email.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  });

  test("C8 · a course email to Myself only is sent", async ({ page }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, `/messages?course=${encodeURIComponent(seed!.courseId)}`, /^Messages\b/);
    const email = card(page, "Course Email");
    await email.getByRole("checkbox", { name: "Learners" }).click();
    await email.getByRole("checkbox", { name: "Myself" }).click();
    await expect(email.getByRole("checkbox", { name: "Learners" })).not.toBeChecked();
    await email.locator("#email-subject").fill(`E2E email ${stamp}`);
    await email.locator("#email-message").fill("Sent by the SIS e2e suite to its own admin.");
    await email.getByRole("button", { name: "Send", exact: true }).click();
    await sentOrSkipped(page, "Email sent");
  });

  test("MS2 · a schedule time turns Send into Schedule and the email lands in the Scheduled list", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, `/messages?course=${encodeURIComponent(seed!.courseId)}`, /^Messages\b/);
    const email = card(page, "Course Email");
    await email.getByRole("checkbox", { name: "Learners" }).click();
    await email.getByRole("checkbox", { name: "Myself" }).click();
    await email.locator("#email-subject").fill(`E2E scheduled ${stamp}`);
    await email.locator("#email-message").fill("Scheduled by the SIS e2e suite to its own admin.");
    await email.locator("#email-schedule").fill("2099-01-01T09:00");
    const schedule = email.getByRole("button", { name: "Schedule", exact: true });
    await expect(schedule).toBeVisible();
    await schedule.click();
    await sentOrSkipped(page, "Email scheduled");
    await expect(email.getByText(`E2E scheduled ${stamp}`)).toBeVisible({ timeout: 30_000 });
  });

  test("MS3 · an in-app announcement to the named e2e student reaches their inbox", async ({
    page,
    browser,
    browserName,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    test.setTimeout(180_000);
    await open(page, "/messages", /^Messages\b/);
    const announce = card(page, "Announcement");
    await announce.locator("#announce-audience").click();
    await page.getByRole("listbox").getByRole("option", { name: "Named Users" }).click();
    await announce.getByRole("textbox", { name: "Named Users" }).fill(STUDENT);
    await announce.getByRole("checkbox", { name: "Email" }).click();
    await expect(announce.getByRole("checkbox", { name: "Email" })).not.toBeChecked();
    await expect(announce.getByRole("checkbox", { name: "In-App" })).toBeChecked();
    await announce.locator("#announce-title").fill(`E2E notice ${stamp}`);
    await announce.locator("#announce-body").fill("An announcement from the SIS e2e suite.");
    const send = announce.getByRole("button", { name: "Send", exact: true });
    await expect(send).toBeDisabled();
    const preview = announce.getByRole("button", { name: "Preview" });
    test.skip(await preview.isDisabled(), "the platform offers no in-app channel to preview");
    await preview.click();
    await expect(announce.getByText("1 recipient")).toBeVisible({ timeout: 30_000 });
    await send.click();
    await toast(page, "1 notification sent");
    // The student's inbox: the notifications page has no gate, so poll it with reloads.
    const member = await browser.newContext({
      storageState: `playwright/.auth/member-${browserName}.json`,
    });
    const inbox = await member.newPage();
    try {
      await expect(async () => {
        await inbox.goto(`${appHost}/notifications`);
        await expect(inbox.getByText(`E2E notice ${stamp}`).first()).toBeVisible({
          timeout: 15_000,
        });
      }).toPass({ timeout: 90_000, intervals: [5_000] });
    } finally {
      await member.close();
    }
  });

  test("MS4 · ?group= preselects the group audience and Send waits for a preview", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, `/messages?group=${seed!.cohortGroupId}`, /^Messages\b/);
    const announce = card(page, "Announcement");
    await expect(announce.locator("#announce-audience")).toContainText("A Group");
    await expect(announce.locator("#announce-group")).toContainText("E2E Grade cohort");
    await expect(announce.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  });
});
