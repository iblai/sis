import { test, expect } from "@playwright/test";
import { STUDENT, open, pickCourse, pickUser, seeded, toast } from "../helpers";

/**
 * Credentials journey — the platform's credentials, issued to the e2e
 * student and revoked again (the revoked row stays on record), and the
 * learning platform's certificates. Skips what the platform does not define.
 */
const stamp = Date.now().toString(36);
const seed = seeded();

test.describe("credentials journey", () => {
  test("CR1 · the page lists the credentials to issue, or says none are defined, with the certificate controls", async ({
    page,
  }) => {
    await open(page, "/credentials", /^Credentials\b/);
    await expect(page.getByRole("button", { name: "Generate Certificates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick a course" })).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: "Issue", exact: true })
        .first()
        .or(page.getByText("No credentials defined")),
    ).toBeVisible();
  });

  test("CR2 · a credential is issued to the e2e student for the seeded course, or is already", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    await open(page, "/credentials", /^Credentials\b/);
    test.skip(
      await page.getByText("No credentials defined").isVisible(),
      "no credential is defined on this platform",
    );
    await page.getByRole("button", { name: "Issue", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: /^Issue “/ });
    await pickCourse(page, dialog.locator("#issue-course"), seed!.courseName);
    await expect(dialog.locator("#issue-to")).toContainText("One Student");
    await pickUser(page, dialog.getByRole("button", { name: "Pick a student" }), STUDENT);
    await dialog.getByRole("button", { name: "Issue", exact: true }).click();
    // A second run finds it issued already: the DM refuses, which is the same end state.
    await toast(page, /credentials? issued|already been issued/);
  });

  test("CR3 · the student's Credentials tab lists the credential and Revoke marks it revoked", async ({
    page,
  }) => {
    test.skip(!seed || !STUDENT, "needs the seed and the student account");
    await open(page, `/students/${STUDENT}?tab=credentials`);
    test.skip(
      await page.getByText("No credentials issued yet.").isVisible(),
      "no credential was issued to the e2e student (CR2 skipped)",
    );
    const valid = page.getByRole("row").filter({ hasText: "Valid" }).first();
    test.skip(
      (await valid.count()) === 0,
      "every credential of the e2e student is already revoked",
    );
    await valid.getByRole("button", { name: "Revoke" }).click();
    const confirm = page.getByRole("alertdialog", { name: /^Revoke “/ });
    await confirm.getByLabel("Reason").fill(`e2e ${stamp}`);
    await confirm.getByRole("button", { name: "Revoke" }).click();
    await toast(page, "Credential Revoked");
    await expect(page.getByRole("row").filter({ hasText: "Revoked" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("CR5 · Generate Certificates starts the learning platform's task for the seeded course", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/credentials", /^Credentials\b/);
    await pickCourse(page, page.getByRole("button", { name: "Pick a course" }), seed!.courseName);
    await page.getByRole("button", { name: "Generate Certificates" }).click();
    await toast(page, "Certificate generation started");
  });
});
