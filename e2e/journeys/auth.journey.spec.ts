import { test, expect } from "@playwright/test";

/**
 * Auth journey — the multi-platform sign-in round trip. Requires
 * auth.setup.ts (pre-authenticated storage state) and a throwaway platform;
 * the community platform (`main`) never works here.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

test.describe("auth journey", () => {
  test("A1 · a fresh profile is sent to the Auth SPA with no platform and lands on one, never main", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const [loginRequest] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes("/login") && req.url().includes("redirect-to="),
        {
          timeout: 60_000,
        },
      ),
      page.goto(appHost),
    ]);
    expect(new URL(loginRequest.url()).searchParams.get("tenant")).toBeNull();
    await context.close();
  });

  test("A1b · an authenticated user lands on their platform's home, not main", async ({ page }) => {
    await page.goto(appHost);
    await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/platform\/main(\/|$|\?)/);
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 30_000 });
  });

  test("A2 · auth tokens and the platform list are stored in localStorage", async ({ page }) => {
    await page.goto(appHost);
    await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
    const state = await page.evaluate(() => ({
      axd: !!localStorage.getItem("axd_token"),
      dm: !!localStorage.getItem("dm_token"),
      tenants: JSON.parse(localStorage.getItem("tenants") ?? "[]").length,
    }));
    expect(state.axd).toBe(true);
    expect(state.dm).toBe(true);
    expect(state.tenants).toBeGreaterThan(0);
    const fromUrl = decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
    const fromSession = await page.evaluate(() => {
      const raw = localStorage.getItem("current_tenant") ?? "";
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string" ? parsed : parsed?.key;
      } catch {
        return raw || localStorage.getItem("tenant");
      }
    });
    expect(fromUrl).toBe(fromSession);
  });

  test("A3 · a path without a platform is prefixed with the platform and keeps its query", async ({
    page,
  }) => {
    await page.goto(`${appHost}/students?invite=1`);
    await page.waitForURL((url) => /\/platform\/[^/]+\/students/.test(url.pathname), {
      timeout: 30_000,
    });
    expect(new URL(page.url()).searchParams.get("invite")).toBe("1");
  });

  test("A4 · /platform/main shows the notice, not the shell", async ({ page }) => {
    await page.goto(`${appHost}/platform/main`);
    await expect(
      page.getByRole("heading", { name: /works inside a school platform/i }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
  });
});
