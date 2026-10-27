import { test, expect } from "@playwright/test";
import { open } from "../helpers";

/** Notifications journey — the SDK bell in the top bar and the SDK inbox page. */
test.describe("notifications journey", () => {
  test("N1 · the bell opens the notification dropdown and View all goes to the inbox", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    await page
      .locator("header")
      .getByRole("button", { name: /notification/i })
      .click();
    const viewAll = page
      .getByRole("button", { name: "View all" })
      .or(page.getByRole("link", { name: "View all" }));
    await expect(viewAll.first()).toBeVisible({ timeout: 15_000 });
    await viewAll.first().click();
    await page.waitForURL((url) => /\/notifications/.test(url.pathname), { timeout: 15_000 });
  });

  test("N2 · the inbox page renders the SDK inbox and alerts tabs", async ({ page }) => {
    await open(page, "/notifications", /^Notifications\b/);
    await expect(
      page
        .getByTestId("notification-inbox-tab")
        .or(page.getByRole("tab", { name: /inbox/i }))
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page
        .getByTestId("notification-alerts-tab")
        .or(page.getByRole("tab", { name: /alerts/i }))
        .first(),
    ).toBeVisible();
  });

  test("N3 · an admin's New Notification opens the send dialog and Escape closes it unsent", async ({
    page,
  }) => {
    await open(page, "/notifications", /^Notifications\b/);
    const create = page.getByRole("button", { name: "New Notification" });
    await expect(create).toBeVisible({ timeout: 30_000 });
    await create.click();
    const dialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: "Send New Notification" }) });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
