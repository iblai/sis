import { test, expect } from "@playwright/test";
import { open } from "../helpers";

/**
 * Errors journey — what a refused or throttled platform read looks like: the
 * load error with the platform's own words, never an empty state (E1); a 429
 * retried by lib/sis/base-query.ts until the page paints (E2). The answers
 * are served by page.route on the home's most-active-courses read — one the
 * SDK's own bootstrap never makes; nothing is written.
 */
const MOST_ACTIVE = /\/api\/overview\/orgs\/[^/]+\/most-active-courses(\?|$)/;

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("errors journey", () => {
  test("E1 · a platform read answered 500 shows the load error with its reason, never an empty state", async ({
    page,
  }) => {
    await page.route(MOST_ACTIVE, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 500, json: { detail: "E2E outage" } })
        : route.continue(),
    );
    await open(page, "", /^Home\b/);
    await expect(page.getByText("Couldn’t load this").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("E2E outage").first()).toBeVisible();
  });

  test("E2 · a throttled platform read is retried until the page paints", async ({ page }) => {
    let reads = 0;
    await page.route(MOST_ACTIVE, (route) => {
      if (route.request().method() !== "GET" || reads++ > 0) return route.continue();
      return route.fulfill({
        status: 429,
        headers: { "Retry-After": "1" },
        json: { detail: "Request was throttled. Expected available in 1 seconds." },
      });
    });
    await open(page, "", /^Home\b/);
    expect(reads).toBeGreaterThanOrEqual(2);
    await expect(page.getByText("Couldn’t load this")).toHaveCount(0);
  });
});
