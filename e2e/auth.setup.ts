import { test as setup, expect, type Locator, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { STUDENT, open, toast } from "./helpers";

dotenv.config({ path: path.resolve(__dirname, ".env.development") });

const APP_HOST = process.env.APP_HOST || "http://localhost:3000";
const AUTH_DIR = path.resolve(__dirname, "../playwright/.auth");

// The login page is found by structure, not by its copy: a password field, a
// button named like "password" that reveals it, an email field, a submit
// button. When the page changes, these four rules are what to update.
const PASSWORD_FIELD = 'input[type="password"]';
const PASSWORD_BUTTON = /password/i;
const EMAIL_FIELD = 'input[type="email"], input[name="email"], input[name="username"]';
const SUBMIT_BUTTON = /^(continue|sign in|log in)$/i;

setup.setTimeout(120_000);

const visible = (locator: Locator, timeout: number) =>
  locator.waitFor({ state: "visible", timeout }).then(
    () => true,
    () => false,
  );

/** The page's controls, for the error that says the login page changed. */
async function controls(page: Page) {
  const tree = await page
    .locator("body")
    .ariaSnapshot()
    .catch(() => "");
  return tree.split("\n").slice(0, 60).join("\n");
}

export async function signIn(page: Page, email: string, password: string, file: string) {
  await page.goto(APP_HOST, { waitUntil: "domcontentloaded", timeout: 30_000 });
  // AuthProvider sends a signed-out visitor to the login page.
  await page.waitForURL((url) => !url.href.startsWith(APP_HOST), { timeout: 60_000 });

  const passwordBox = page.locator(PASSWORD_FIELD).first();
  if (!(await visible(passwordBox, 5_000))) {
    const reveal = page.getByRole("button", { name: PASSWORD_BUTTON }).first();
    if (await visible(reveal, 30_000)) await reveal.click();
  }
  if (!(await visible(passwordBox, 15_000))) {
    throw new Error(
      `The login page offers no password sign-in I recognise. Its controls:\n${await controls(page)}\n` +
        "— update the four resolver rules at the top of e2e/auth.setup.ts, or ask your ibl.ai " +
        "operator if the page now needs a code or CAPTCHA.",
    );
  }
  const emailBox = page
    .locator(EMAIL_FIELD)
    .or(page.getByRole("textbox", { name: /email|username/i }))
    .first();
  await emailBox.fill(email);
  await passwordBox.fill(password);
  await passwordBox.press("Enter");
  // A form that ignores Enter still has a submit button.
  const submitted = await passwordBox.waitFor({ state: "hidden", timeout: 3_000 }).then(
    () => true,
    () => false,
  );
  if (!submitted) {
    await page
      .getByRole("button", { name: SUBMIT_BUTTON })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
  }

  try {
    await page.waitForURL((url) => url.href.startsWith(APP_HOST), { timeout: 60_000 });
  } catch {
    const refused =
      (await passwordBox.isVisible().catch(() => false)) ||
      (await page
        .getByText(/invalid|incorrect|wrong|not match/i)
        .first()
        .isVisible()
        .catch(() => false));
    if (refused) {
      throw new Error(
        `Sign-in refused for ${email}. If pnpm e2e:accounts just created this account, the platform ` +
          "did not store its password: ask your ibl.ai operator to let the user API set passwords.",
      );
    }
    const { origin, pathname } = new URL(page.url());
    throw new Error(
      `Sign-in did not return to ${APP_HOST} (stopped at ${origin}${pathname}). Add ${APP_HOST} to the ` +
        "platform's allowed redirect origins, or ask your ibl.ai operator.",
    );
  }
  await page.waitForFunction(
    () => !!(localStorage.getItem("axd_token") || localStorage.getItem("dm_token")),
    { timeout: 30_000 },
  );
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: path.join(AUTH_DIR, file) });
}

setup("authenticate", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_USERNAME || "";
  const password = process.env.PLAYWRIGHT_PASSWORD || "";
  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set in e2e/.env.development: run pnpm e2e:accounts",
    );
  }
  // Keyed by project name (setup-chromium, …): the journeys, scripts/screenshots.mjs and scripts/probe-lms.mjs read it.
  await signIn(page, email, password, `user-${setup.info().project.name}.json`);
});

setup("authenticate the member", async ({ page, browserName }) => {
  const email = process.env.PLAYWRIGHT_MEMBER_USERNAME || "";
  const password = process.env.PLAYWRIGHT_MEMBER_PASSWORD || "";
  setup.skip(
    !email || !password,
    "no student account in e2e/.env.development (PLAYWRIGHT_MEMBER_*): pnpm e2e:accounts creates one",
  );
  await signIn(page, email, password, `member-${browserName}.json`);
});

/** A list editor section of Setup, by its heading. */
const section = (page: Page, heading: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });

/**
 * The school baseline every journey relies on, created once and never removed:
 * a 2099 year and term (never "current", so the Grades pages keep their
 * default), a grade level with its cohort group, the default student fields,
 * the e2e student's required record values and their enrollment in one course.
 * Idempotent: a second run changes nothing. Writes playwright/.auth/seed.json.
 */
setup("seed the school", async ({ browser }) => {
  setup.setTimeout(300_000);
  const context = await browser.newContext({
    storageState: path.join(AUTH_DIR, `user-${setup.info().project.name}.json`),
  });
  const page = await context.newPage();
  // A write that never answers is the usual failure here: name it.
  const failures: string[] = [];
  page.on("response", (res) => {
    if (res.status() < 400) return;
    void res
      .text()
      .catch(() => "")
      .then((body) =>
        failures.push(
          `${res.status()} ${res.request().method()} ${res.url()}\n  ${body.slice(0, 400)}`,
        ),
      );
  });
  page.on("requestfailed", (req) => failures.push(`failed ${req.method()} ${req.url()}`));
  try {
    // 1. Year and term.
    await open(page, "/setup?tab=terms", /^Setup\b/);
    const years = section(page, "School Years");
    if ((await years.locator('input[value="E2E Year"]').count()) === 0) {
      await years.getByRole("button", { name: "Add Row" }).click();
      await years.getByLabel("Year").last().fill("E2E Year");
      await years.getByLabel("Start", { exact: true }).last().fill("2099-01-01");
      await years.getByLabel("End", { exact: true }).last().fill("2099-12-31");
      await years.getByRole("button", { name: "Save" }).click();
      await toast(page, "Saved");
      await page.reload();
      await expect(years.locator('input[value="E2E Year"]')).toBeVisible({ timeout: 30_000 });
    }
    const terms = section(page, "Terms");
    if ((await terms.locator('input[value="E2E Term"]').count()) === 0) {
      await terms.getByRole("button", { name: "Add Row" }).click();
      await terms.getByLabel("Term").last().fill("E2E Term");
      await terms.getByRole("combobox", { name: "Year" }).last().click();
      await page
        .getByRole("listbox")
        .getByRole("option", { name: "E2E Year", exact: true })
        .click();
      await terms.getByLabel("Start", { exact: true }).last().fill("2099-02-01");
      await terms.getByLabel("End", { exact: true }).last().fill("2099-06-30");
      await terms.getByRole("button", { name: "Save" }).click();
      await toast(page, "Saved");
    }

    // 2. A grade level with a cohort group.
    await open(page, "/setup?tab=levels", /^Setup\b/);
    const level = page.getByRole("row").filter({ has: page.locator('input[value="E2E Grade"]') });
    if ((await level.count()) === 0) {
      await page.getByRole("button", { name: "Add Row" }).click();
      await page.getByLabel("Level").last().fill("E2E Grade");
      await page.getByLabel("Order").last().fill("999");
      await level.getByRole("button", { name: "Create Cohort Group" }).click();
      await toast(page, /created/);
      await page.getByRole("button", { name: "Save" }).click();
      await toast(page, "Saved");
      await page.reload();
    }
    const groupText = await level.getByText(/Group #\d+/).textContent({ timeout: 30_000 });
    const cohortGroupId = Number(groupText!.match(/#(\d+)/)![1]);

    // 3. The default student fields.
    await open(page, "/setup?tab=fields", /^Setup\b/);
    await page.getByRole("button", { name: "Seed Defaults" }).click();
    await toast(page, /field(s)? added|already exists/);

    let courseId = "";
    let courseName = "";
    if (STUDENT) {
      // 4. The student's membership and required record values.
      await open(page, `/students/${encodeURIComponent(STUDENT)}?tab=record`);
      const reactivate = page.getByRole("button", { name: "Reactivate", exact: true });
      if (await reactivate.isVisible()) {
        await reactivate.click();
        await toast(page, "Membership reactivated", 60_000);
        await page.reload();
        await expect(page.getByRole("tab", { name: "Record" })).toBeVisible({ timeout: 30_000 });
      }
      let dirty = false;
      const studentId = page.locator("#custom-student_id");
      if ((await studentId.inputValue()) === "") {
        await studentId.fill(`E2E-${STUDENT}`);
        dirty = true;
      }
      for (const [id, option] of [
        ["#custom-grade_level", "E2E Grade"],
        ["#custom-enrollment_status", "Active"],
      ] as const) {
        const trigger = page.locator(id);
        if ((await trigger.innerText()).includes("Select…")) {
          await trigger.click();
          await page
            .getByRole("listbox")
            .getByRole("option", { name: option, exact: true })
            .click();
          dirty = true;
        }
      }
      if (dirty) {
        await page.getByRole("button", { name: "Save", exact: true }).click();
        await toast(page, "Record saved", 60_000);
      }

      // 5. One enrollment, through a course invitation.
      await open(page, `/students/${encodeURIComponent(STUDENT)}?tab=enrollment`);
      const enrolled = page
        .getByRole("row")
        .filter({ has: page.getByText("Enrolled", { exact: true }) });
      const pending = page.getByText(/invitations? pending/);
      if ((await enrolled.count()) === 0 && (await pending.count()) === 0) {
        await page.getByRole("button", { name: "Enroll", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "Enroll in a Course" });
        await dialog.locator("#enroll-section").click();
        await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible({
          timeout: 30_000,
        });
        await page.getByPlaceholder("Search courses…").press("Enter");
        await expect(dialog.locator("#enroll-section")).not.toContainText("Pick a course");
        await dialog.getByRole("button", { name: "Enroll", exact: true }).click();
        await toast(page, "Enrolled", 60_000);
      }
      // The enrollment list is an LMS read the invitation does not refetch.
      await expect(async () => {
        await page.reload();
        await expect(enrolled.first()).toBeVisible({ timeout: 20_000 });
      }).toPass({ timeout: 120_000, intervals: [5_000] });
      const link = enrolled.first().getByRole("link").first();
      courseName = (await link.textContent())!.trim();
      courseId = decodeURIComponent((await link.getAttribute("href"))!.split("/courses/")[1]);
    } else {
      await open(page, "/courses", /^Courses\b/);
      const link = page.getByRole("row").nth(1).getByRole("link").first();
      courseName = (await link.textContent())!.trim();
      courseId = decodeURIComponent((await link.getAttribute("href"))!.split("/courses/")[1]);
    }

    fs.writeFileSync(
      path.join(AUTH_DIR, "seed.json"),
      JSON.stringify({ courseId, courseName, cohortGroupId }, null, 2),
    );
  } catch (err) {
    if (failures.length) console.log(`seed: requests that failed:\n${failures.join("\n")}`);
    throw err;
  } finally {
    await context.close();
  }
});
