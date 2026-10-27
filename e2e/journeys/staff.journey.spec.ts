import { test, expect } from "@playwright/test";
import { ADMIN, open } from "../helpers";

/**
 * Staff journey — the staff directory and one staff member's page. Role
 * writes (Make/Remove Admin or Teacher) have no safe target on a shared
 * platform and are not exercised: the only candidate is the e2e student.
 */
const stamp = Date.now().toString(36);

test.describe("staff journey", () => {
  test("SF1 · the list shows the e2e admin as Admin, searches, and nonsense finds nothing", async ({
    page,
  }) => {
    test.skip(!ADMIN, "no admin account in e2e/.env.development");
    await open(page, "/staff", /^Staff\b/);
    const search = page.getByLabel("Search", { exact: true });
    await search.fill(ADMIN);
    const row = page.getByRole("row").filter({ hasText: ADMIN });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText("Admin", { exact: true })).toBeVisible();
    await search.fill(`zz-nobody-${stamp}`);
    await expect(page.getByText("No staff member matches")).toBeVisible({ timeout: 15_000 });
  });

  test("SF2 · Invite Staff opens the invite dialog on ?invite=1 and closing returns to the list", async ({
    page,
  }) => {
    await open(page, "/staff", /^Staff\b/);
    await page.getByRole("button", { name: "Invite Staff", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("invite") === "1", { timeout: 15_000 });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await page.waitForURL((url) => !url.searchParams.has("invite"), { timeout: 15_000 });
  });

  test("SF3 · the admin's own page shows the roles, no role buttons for yourself, and checks the courses", async ({
    page,
  }) => {
    test.skip(!ADMIN, "no admin account in e2e/.env.development");
    await open(page, `/staff/${ADMIN}`);
    const roles = page.locator("section").filter({ hasText: "Roles" });
    await expect(roles.getByText("Platform Admin", { exact: true })).toBeVisible();
    await expect(roles.getByText("Yes", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Make Admin|Remove Admin/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Make Teacher|Remove Teacher/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Check Courses" }).click();
    const taught = page.locator("section").filter({ hasText: "Courses Taught" });
    await expect(
      taught
        .getByRole("link")
        .or(taught.getByText(/No courses|none|—/i))
        .first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
