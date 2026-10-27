import { test, expect } from "@playwright/test";
import { STUDENT, open, pickUser, toast } from "../helpers";

/**
 * Groups journey — DM user groups on the throwaway platform: one group is
 * created, renamed, filled and emptied, announced from, and deleted, in that
 * order (serial: a failed step skips the rest).
 */
const stamp = Date.now().toString(36);
const NAME = `Homeroom ${stamp}`;
let groupId = "";

test.describe("groups journey", () => {
  test("G1 · search finds the seeded cohort group and a nonsense query finds nothing", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const search = page.getByRole("searchbox").or(page.getByLabel("Search", { exact: true }));
    await search.fill("E2E Grade cohort");
    await expect(page.getByRole("link", { name: "E2E Grade cohort" })).toBeVisible({
      timeout: 15_000,
    });
    await search.fill(`zz-nobody-${stamp}`);
    await expect(page.getByText("No group matches")).toBeVisible({ timeout: 15_000 });
  });

  test("G7 · the New Group dialog refuses an empty name and Cancel returns to the list", async ({
    page,
  }) => {
    await open(page, "/groups?new=1", { dialog: "New Group" });
    const dialog = page.getByRole("dialog", { name: "New Group" });
    await expect(dialog.getByRole("button", { name: "Create", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL((url) => !url.searchParams.has("new"), { timeout: 15_000 });
  });

  test.describe.configure({ mode: "serial" });

  test("C6 · a group is created and the app lands on it", async ({ page }) => {
    await open(page, "/groups?new=1", { dialog: "New Group" });
    await page.getByLabel("Name", { exact: true }).fill(NAME);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL((url) => /\/groups\/\d+/.test(url.pathname), { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(`^${NAME}\\b`) }),
    ).toBeVisible({ timeout: 15_000 });
    groupId = page.url().match(/\/groups\/(\d+)/)![1];
  });

  test("G2 · Edit renames the group", async ({ page }) => {
    test.skip(!groupId, "C6 did not create the group");
    await open(page, `/groups/${groupId}`, new RegExp(`^${NAME}\\b`));
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Group" });
    await dialog.locator("#group-name").fill(`${NAME} v2`);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await toast(page, "Group updated");
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(`^${NAME} v2\\b`) }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("G3 · a member is added from the picker and removed again", async ({ page }) => {
    test.skip(!groupId, "C6 did not create the group");
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/groups/${groupId}`);
    const panel = page.locator("section").filter({ hasText: "Add a Member" });
    await pickUser(page, panel.getByRole("button", { name: "Pick a member" }), STUDENT);
    await panel.getByRole("button", { name: "Add", exact: true }).click();
    await toast(page, /added/);
    const member = page.getByRole("link", { name: new RegExp(STUDENT) });
    await expect(member).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole("listitem")
      .filter({ has: member })
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await toast(page, "Member removed");
    await expect(member).toHaveCount(0);
  });

  test("G4 · Add Many adds the usernames it knows and names the ones it does not", async ({
    page,
  }) => {
    test.skip(!groupId, "C6 did not create the group");
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/groups/${groupId}`);
    const panel = page.locator("section").filter({ hasText: "Add Many" });
    await panel.getByRole("textbox").fill(`${STUDENT}\nzz-nobody-${stamp}`);
    await panel.getByRole("button", { name: "Add All" }).click();
    await toast(page, "1 member added");
    await toast(page, `Not found: zz-nobody-${stamp}`);
    const member = page.getByRole("link", { name: new RegExp(STUDENT) });
    await expect(member).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole("listitem")
      .filter({ has: member })
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await toast(page, "Member removed");
  });

  test("G5 · Announce opens Messages with the group preselected", async ({ page }) => {
    test.skip(!groupId, "C6 did not create the group");
    await open(page, `/groups/${groupId}`);
    await page.getByRole("button", { name: "Announce" }).click();
    await page.waitForURL((url) => url.searchParams.get("group") === groupId, { timeout: 15_000 });
    await expect(page.locator("#announce-audience")).toContainText("A Group");
    await expect(page.locator("#announce-group")).toContainText(NAME);
  });

  test("G6 · Delete removes the group and the list no longer finds it", async ({ page }) => {
    test.skip(!groupId, "C6 did not create the group");
    await open(page, `/groups/${groupId}`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await toast(page, "Group deleted");
    await page.waitForURL((url) => /\/groups\/?$/.test(url.pathname), { timeout: 15_000 });
    await page.getByLabel("Search", { exact: true }).fill(NAME);
    await expect(page.getByText("No group matches")).toBeVisible({ timeout: 15_000 });
  });
});
