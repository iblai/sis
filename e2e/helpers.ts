import { expect, type Locator, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/** The app under test. Paths are opened without a platform: TenantRedirect prefixes it. */
export const appHost = process.env.APP_HOST || "http://localhost:3000";

/** The two test accounts' usernames (create-accounts.mjs saves the email as `<username>@example.com`). */
export const ADMIN = (process.env.PLAYWRIGHT_USERNAME || "").split("@")[0];
export const STUDENT = (process.env.PLAYWRIGHT_MEMBER_USERNAME || "").split("@")[0];

/** cmdk's search input, the one place a picker's query goes (the pages reuse its placeholder). */
const cmdkInput = (page: Page) => page.locator("[cmdk-input]");

/**
 * Pick a directory member in a UserPicker by username: cmdk selects the
 * highlighted row on Enter (a mouse click on the row does not fire its
 * select); the popover closing is the proof it selected.
 */
export async function pickUser(page: Page, trigger: Locator, username: string) {
  await trigger.click();
  await cmdkInput(page).fill(username);
  await expect(
    page
      .getByRole("listbox")
      .getByRole("option", { name: new RegExp(`${username}@`) })
      .first(),
  ).toBeVisible({ timeout: 15_000 });
  await cmdkInput(page).press("Enter");
  await expect(cmdkInput(page)).toHaveCount(0);
}

/** Pick a course in a SectionPicker by its name, the same way. */
export async function pickCourse(page: Page, trigger: Locator, name: string) {
  await trigger.click();
  await cmdkInput(page).fill(name);
  await expect(page.getByRole("listbox").getByRole("option", { name }).first()).toBeVisible({
    timeout: 15_000,
  });
  await cmdkInput(page).press("Enter");
  await expect(cmdkInput(page)).toHaveCount(0);
}

/** Whether the installed web-containers build mentions `symbol` in `file` (its types by default; pnpm hoists one copy of every @iblai package to the root). */
export function sdkHas(symbol: string, file = "dist/index.d.ts"): boolean {
  const target = path.resolve(__dirname, "../node_modules/@iblai/web-containers", file);
  return fs.existsSync(target) && fs.readFileSync(target, "utf8").includes(symbol);
}

/** What auth.setup.ts seeded on the platform; `null` until the setup project has run. */
export function seeded(): { courseId: string; courseName: string; cohortGroupId: number } | null {
  const file = path.resolve(__dirname, "../playwright/.auth/seed.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

/** Responses ≥ 400 seen on a page since `open()`, for the error a missing toast throws. */
const refused = new WeakMap<Page, string[]>();
function watchRefused(page: Page) {
  if (refused.has(page)) return;
  const list: string[] = [];
  refused.set(page, list);
  page.on("response", (res) => {
    if (res.status() < 400) return;
    void res
      .text()
      .catch(() => "")
      .then((body) =>
        list.push(`${res.status()} ${res.request().method()} ${res.url()} ${body.slice(0, 300)}`),
      );
  });
}

/** The platform key in the page's URL. */
export function platformOf(page: Page) {
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

/** The page is painted: the h1 is visible and every PageGate has settled. */
export async function ready(page: Page, h1: RegExp | string = /./) {
  await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("status", { name: "Loading…" })).toHaveCount(0, { timeout: 60_000 });
}

/**
 * Open a platform path and wait for the page to be painted — or, for a path
 * that opens a dialog (`/groups?new=1`), for that dialog: a modal hides the
 * page's heading from the accessibility tree.
 */
export async function open(
  page: Page,
  path = "",
  waitFor: RegExp | string | { dialog: RegExp | string } = /./,
) {
  watchRefused(page);
  await page.goto(`${appHost}${path}`);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  if (waitFor instanceof RegExp || typeof waitFor === "string") await ready(page, waitFor);
  else
    await expect(page.getByRole("dialog", { name: waitFor.dialog })).toBeVisible({
      timeout: 60_000,
    });
}

/**
 * A sonner toast with that text, closed afterwards so a stale one never
 * satisfies the next wait. When it never comes, the error names every refused
 * request the page saw, which is usually the reason.
 */
export async function toast(page: Page, text: string | RegExp, timeout = 15_000) {
  const el = page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
  try {
    await expect(el).toBeVisible({ timeout });
  } catch (err) {
    const seen = refused.get(page) ?? [];
    if (seen.length)
      (err as Error).message += `\nRefused requests on this page:\n${seen.join("\n")}`;
    throw err;
  }
  await el
    .getByRole("button", { name: /close/i })
    .click({ timeout: 2_000 })
    .catch(() => {});
}

/** Open the SDK profile dropdown. */
export async function openProfileMenu(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "More options" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible({ timeout: 10_000 });
  return menu;
}

/** Flip the Admin Mode switch only when it differs from `on`. */
export async function setAdminMode(page: Page, on: boolean) {
  const sw = page.getByRole("switch", { name: "Admin Mode" });
  await expect(sw).toBeVisible({ timeout: 10_000 });
  if ((await sw.isChecked()) !== on) await sw.click();
  if (on) await expect(sw).toBeChecked();
  else await expect(sw).not.toBeChecked();
}
