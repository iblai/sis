import { test, expect, type Browser } from "@playwright/test";
import { appHost, open, platformOf } from "../helpers";

/**
 * Auth journey — the multi-platform sign-in round trip. Requires
 * auth.setup.ts (pre-authenticated storage state) and a throwaway platform;
 * the community platform (`main`) never works here.
 */
const stamp = Date.now().toString(36);

/** The login request a signed-out visitor to `path` is sent to. */
async function loginRequestFor(browser: Browser, path = "") {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  const [request] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes("/login") && req.url().includes("redirect-to="),
      { timeout: 60_000 },
    ),
    page.goto(`${appHost}${path}`),
  ]);
  await context.close();
  return new URL(request.url());
}

test.describe("auth journey", () => {
  test("A1 · a fresh profile is sent to the Auth SPA with no platform and lands on one, never main", async ({
    browser,
  }) => {
    const login = await loginRequestFor(browser);
    expect(login.searchParams.get("tenant")).toBeNull();
  });

  test("A1b · an authenticated user lands on their platform's home, not main", async ({ page }) => {
    // The admin home waits for the DM overview reads, ~25 s on a busy platform.
    await open(page, "", /^Home\b/);
    expect(page.url()).not.toMatch(/\/platform\/main(\/|$|\?)/);
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

  test("A4 · /platform/main never shows the shell: the notice, or a move to the user's own platform", async ({
    page,
  }) => {
    await page.goto(`${appHost}/platform/main`);
    const onMain = () => /\/platform\/main(\/|$)/.test(new URL(page.url()).pathname);
    const notice = page.getByRole("heading", { name: /works inside a school platform/i });
    // A member of main sees the notice; anyone else is moved to their own platform by the SDK.
    await expect
      .poll(async () => (!onMain() ? "moved" : (await notice.isVisible()) ? "notice" : "pending"), {
        timeout: 60_000,
      })
      .not.toBe("pending");
    if (onMain()) {
      await expect(notice).toBeVisible();
      await expect(page.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
    }
  });

  test("A5 · a platform the user does not belong to sends them to sign in for it, never into the shell", async ({
    page,
  }) => {
    const key = `zz-no-such-platform-${stamp}`;
    const [login] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/login") && req.url().includes("tenant="), {
        timeout: 90_000,
      }),
      page.goto(`${appHost}/platform/${key}`),
    ]);
    expect(new URL(login.url()).searchParams.get("tenant")).toBe(key);
    await expect(page.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
  });

  test("A6 · an unknown page under the platform ends on the 404 page and Go Home lands on the platform", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const key = platformOf(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/nope-${stamp}`);
    await page.waitForURL((url) => url.pathname === "/error/404", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await page.getByRole("link", { name: "Go Home" }).click();
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, "") === `/platform/${encodeURIComponent(key)}`,
      { timeout: 30_000 },
    );
  });

  test("A7 · a fresh profile opening a platform page is sent to sign in for that platform and page", async ({
    page,
    browser,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const key = platformOf(page);
    const login = await loginRequestFor(browser, `/platform/${encodeURIComponent(key)}/groups`);
    expect(login.searchParams.get("tenant")).toBe(key);
    expect(login.searchParams.get("redirect-to") ?? "").toMatch(new RegExp(`^${appHost}`));
  });

  test("A8 · the auth-redirect proxy hops only to the Auth SPA's own origin", async ({
    browser,
    request,
  }) => {
    const login = await loginRequestFor(browser);
    const refused = await request.get(
      `${appHost}/api/auth-redirect?to=${encodeURIComponent("https://evil.example.com/login")}`,
      { maxRedirects: 0 },
    );
    expect(refused.status()).toBe(400);
    expect(await refused.json()).toEqual({ error: "Invalid redirect URL" });
    const allowed = await request.get(
      `${appHost}/api/auth-redirect?to=${encodeURIComponent(`${login.origin}/login`)}`,
      { maxRedirects: 0 },
    );
    expect([301, 302, 307, 308]).toContain(allowed.status());
    expect(allowed.headers()["location"]).toMatch(new RegExp(`^${login.origin}/login`));
  });
});
