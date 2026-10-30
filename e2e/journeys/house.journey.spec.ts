import { test, expect, type Page } from "@playwright/test";
import { appHost, sdkHas } from "../helpers";

/**
 * House journey — the first-run paths of an ibl.ai official app
 * (/iblai-vibe-house-journeys): a user whose only platform is the community
 * one (H1–H2), a visitor on a platform they do not belong to (H3–H4, H9), an
 * admin's first run (H5–H6, H10) and a member's (H7–H8). Platform-wide state
 * is served with page.route and never written; the accounts' own metadata
 * writes are answered by the route too, so they stay fresh. Signed in through
 * auth.setup.ts; the member tests skip until pnpm e2e:accounts has created
 * the student account.
 */
const MAIN = process.env.NEXT_PUBLIC_MAIN_TENANT_KEY || "main";
const stamp = Date.now().toString(36);
// Answers a navigation the test only inspects; a 204 never commits, and a click waits for it.
const stub = { contentType: "text/html", body: "<title>stub</title>" };
const noMember = !process.env.PLAYWRIGHT_MEMBER_USERNAME || !process.env.PLAYWRIGHT_MEMBER_PASSWORD;
const NO_MEMBER =
  "no student account in e2e/.env.development (PLAYWRIGHT_MEMBER_*): pnpm e2e:accounts creates one";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const home = (org: string) => new RegExp(`/platform/${esc(org)}/?(\\?|#|$)`);
const onboarding = (org: string) => new RegExp(`/platform/${esc(org)}/onboarding(/|\\?|#|$)`);

/** The platform the session lands on: the segment after /platform/. */
async function landedOrg(page: Page): Promise<string> {
  await page.goto(`${appHost}/`);
  await page.waitForURL(/\/platform\/[^/?#]+/, { timeout: 30_000 });
  return decodeURIComponent(new URL(page.url()).pathname.split("/")[2]);
}

/** web-utils 2.18 reads a platform's metadata from the membership list: serve `edit` there too. */
async function editListedMetadata(
  page: Page,
  edit: (metadata: Record<string, unknown>) => Record<string, unknown>,
) {
  await page.route(/\/api\/core\/users\/platforms\//, async (route) => {
    const res = await route.fetch();
    const all = (await res.json()) as { key: string; metadata?: Record<string, unknown> }[];
    await route.fulfill({
      response: res,
      json: all.map((p) => (p.key === MAIN ? p : { ...p, metadata: edit(p.metadata ?? {}) })),
    });
  });
}

/** The student's session, saved per browser by auth.setup.ts. */
// A platform answer still in flight when a test ends must not fail the next one.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const memberState = async (
  { browserName }: { browserName: string },
  use: (state: string) => Promise<void>,
) => {
  await use(`playwright/.auth/member-${browserName}.json`);
};

test.describe("a user whose only platform is the community one", () => {
  test.skip(noMember, NO_MEMBER);
  test.use({ storageState: memberState });
  // The student's session, told it belongs to the community platform only —
  // in storage and by the platform's membership list, which the SDK re-reads
  // on every load.
  test.beforeEach(async ({ page }) => {
    const entry = {
      key: MAIN,
      org: MAIN,
      platform_name: "ibl.ai",
      is_admin: false,
      show_paywall: true,
    };
    await page.route(/\/api\/ibl\/users\/manage\/platform\//, (route) =>
      route.fulfill({ json: [entry] }),
    );
    // The list newer web-utils reads: the student's real memberships, the community one alone kept.
    await page.route(/\/api\/core\/users\/platforms\//, async (route) => {
      const res = await route.fetch();
      const all = (await res.json()) as { key: string }[];
      await route.fulfill({ response: res, json: all.filter((p) => p.key === MAIN) });
    });
    await page.addInitScript((only: typeof entry) => {
      localStorage.setItem("tenants", JSON.stringify([only]));
      localStorage.setItem("tenant", only.key);
      localStorage.setItem("current_tenant", JSON.stringify(only));
      localStorage.setItem("app_tenant", only.key);
    }, entry);
  });

  test("H1 · lands on the community platform inside the shell, with the admin cluster shown", async ({
    page,
  }) => {
    await page.goto(`${appHost}/`);
    await expect(page).toHaveURL(home(MAIN), { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Management" })).toBeVisible({ timeout: 30_000 });
  });

  test("H12 · the community platform shows the sample school: the admin rows, a filled Students list and the notice", async ({
    page,
  }) => {
    await page.goto(`${appHost}/platform/${encodeURIComponent(MAIN)}/students`);
    await expect(page.getByTestId("sample-notice")).toContainText("Northbridge Academy", {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: /^Students\b/ })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Ava Chen").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Grades", exact: true })).toBeVisible();
  });

  test("H13 · a write on the sample school opens the upgrade dialog", async ({ page }) => {
    await page.goto(`${appHost}/platform/${encodeURIComponent(MAIN)}/groups?new=1`);
    const dialog = page.getByRole("dialog", { name: "New Group" });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Name", { exact: true }).fill("Chess Club");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("dialog").filter({ hasText: "Upgrade for free" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("H14 · the upgrade dialog's Upgrade for free opens this app's $0 checkout", async ({
    page,
  }) => {
    test.skip(
      !sdkHas("checkoutUrl"),
      "web-containers lacks checkoutUrl: the release of iblai-web-frontend#2195",
    );
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sis.iblai.me").replace(/\/+$/, "");
    let checkout = "";
    await page.route(/credits-free-plan/, (route) => {
      checkout = route.request().url();
      return route.fulfill(stub);
    });
    await page.goto(`${appHost}/platform/${encodeURIComponent(MAIN)}`);
    await page
      .getByTestId("sample-notice")
      .getByRole("button", { name: "Create Your Platform" })
      .click({ timeout: 30_000 });
    await page.getByRole("dialog").getByRole("button", { name: "Upgrade for free" }).click();
    await expect
      .poll(() => checkout)
      .toContain("/api/service/stripe/checkout/redirect/credits-free-plan/");
    const back = new URL(new URL(checkout).searchParams.get("redirect_url") ?? "");
    expect(back.searchParams.get("app")).toBe("mentor");
    expect(back.searchParams.get("redirect-to")).toBe(appUrl);
  });

  test("H2 · a trial-gated click opens the SDK upgrade dialog, and Escape closes it", async ({
    page,
  }) => {
    await page.goto(`${appHost}/platform/${encodeURIComponent(MAIN)}`);
    await page.getByRole("button", { name: "Management" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Upgrade for free", { timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("a visitor on a platform they do not belong to", () => {
  test.skip(noMember, NO_MEMBER);
  test.use({ storageState: memberState });
  const stranger = `e2e-nowhere-${stamp}`;

  test("H3 · the platform is previewed, and Join goes to the auth page's join for it", async ({
    page,
  }) => {
    let joinUrl = "";
    await page.route(/\/join\?tenant=/, (route) => {
      joinUrl = route.request().url();
      return route.fulfill(stub);
    });
    await page.goto(`${appHost}/platform/${stranger}`);
    const preview = page.getByTestId("organization-preview");
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await expect(preview).toContainText(stranger);
    await preview.getByRole("button", { name: `Join ${stranger}` }).click();
    await expect.poll(() => joinUrl).toContain(`tenant=${stranger}`);
    expect(new URL(joinUrl).searchParams.get("redirect-to")).toContain(`/platform/${stranger}`);
  });

  test("H4 · Create Your Own Platform is ibl.ai's $0 sign-up with this app nested in the return address", async ({
    page,
  }) => {
    let checkout = "";
    await page.route(/credits-free-plan/, (route) => {
      checkout = route.request().url();
      return route.fulfill(stub);
    });
    await page.goto(`${appHost}/platform/${stranger}`);
    await page
      .getByTestId("organization-preview")
      .getByRole("button", { name: "Create Your Own Platform" })
      .click();
    await expect
      .poll(() => checkout)
      .toContain("/api/service/stripe/checkout/redirect/credits-free-plan/");
    const back = new URL(checkout).searchParams.get("redirect_url") ?? "";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sis.iblai.me").replace(/\/+$/, "");
    expect(new URL(back).searchParams.get("redirect-to")).toBe(appUrl);
  });

  test("H9 · Back to My Platform leaves the preview for the user's own platform home", async ({
    page,
  }) => {
    await page.goto(`${appHost}/platform/${stranger}`);
    await page
      .getByTestId("organization-preview")
      .getByRole("link", { name: "Back to My Platform" })
      .click();
    await page.waitForURL(
      (url) => /\/platform\/[^/?#]+/.test(url.pathname) && !url.pathname.includes(stranger),
      { timeout: 30_000 },
    );
    await expect(page.getByRole("heading", { level: 1, name: /^Home\b/ })).toBeVisible({
      timeout: 60_000,
    });
  });
});

test.describe("an admin's first run", () => {
  test("H5 · a readably keyed platform is not asked its name: the first run is sector, team, done, and the home holds afterwards", async ({
    page,
  }) => {
    // The admin's record: never completed on read, every write kept here.
    const records: Record<string, unknown>[] = [];
    await page.route(/\/api\/core\/users\/platform-metadata\//, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { username: "", platform_key: "", metadata: {} } });
      }
      const sent = route.request().postDataJSON() as { metadata?: Record<string, unknown> };
      records.push(sent.metadata ?? {});
      return route.fulfill({
        json: { username: "", platform_key: "", metadata: sent.metadata ?? {} },
      });
    });
    // The platform's metadata read without its sector; a write stays here.
    const sectors: unknown[] = [];
    await page.route(/\/api\/core\/orgs\/[^/]+\/metadata\//, async (route) => {
      const req = route.request();
      if (req.method() === "GET") {
        const res = await route.fetch();
        const body = (await res.json()) as { metadata?: Record<string, unknown> };
        const { sector: _unset, ...rest } = body.metadata ?? {};
        return route.fulfill({ response: res, json: { ...body, metadata: rest } });
      }
      const sent = req.postDataJSON() as { metadata?: { sector?: unknown } };
      sectors.push(sent.metadata?.sector);
      return route.fulfill({ json: { metadata: sent.metadata ?? {} } });
    });
    await editListedMetadata(page, ({ sector: _unset, ...rest }) => rest);
    const renames: unknown[] = [];
    await page.route(/\/api\/core\/platform\/$/, (route) => {
      renames.push(route.request().postDataJSON());
      return route.fulfill({ json: {} });
    });

    const org = await landedOrg(page);
    await expect(page).toHaveURL(onboarding(org), { timeout: 30_000 });
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 30_000 });
    if (sdkHas("initialAnswers")) {
      // The key is readable, so the name is known and the sector opens the flow.
      await expect(page.getByLabel("Organization name")).toHaveCount(0);
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "this web-containers build asks every step; the name step is walked, never written",
      });
      await page.getByLabel("Organization name").fill("E2E School");
      await page.getByRole("button", { name: "Continue" }).click();
    }
    await page.getByRole("radio", { name: "Higher Education" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Invite your team")).toBeVisible();
    await page.getByRole("button", { name: /^(Continue|Skip for now)$/ }).click();
    await expect(page.getByTestId("onboarding-final-step")).toContainText("All Set", {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page).toHaveURL(home(org), { timeout: 30_000 });
    // The record read still says "not completed": the home holds anyway.
    await page.waitForTimeout(5_000);
    await expect(page).toHaveURL(home(org));
    await expect(page.getByTestId("onboarding-page")).toHaveCount(0);
    expect(renames).toEqual([]);
    // Only a build that skips known steps also writes the platform's sector.
    expect(sectors).toEqual(sdkHas("initialAnswers") ? ["higher_education"] : []);
    expect(records.at(-1)).toMatchObject({
      onboarding: { completed: true, sector: "higher_education", version: 1 },
    });
  });

  test("H6 · an admin who finished it stays home", async ({ page }) => {
    await page.route(/\/api\/core\/users\/platform-metadata\//, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            json: { username: "", platform_key: "", metadata: { onboarding: { completed: true } } },
          })
        : route.continue(),
    );
    const org = await landedOrg(page);
    await expect(page).toHaveURL(home(org), { timeout: 30_000 });
    await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("onboarding-page")).toHaveCount(0);
  });

  test("H11 · a named platform whose sector is set gets only the team step and the finish", async ({
    page,
  }) => {
    test.skip(
      !sdkHas("initialAnswers"),
      "web-containers lacks initialAnswers: the release after 1.56.0 (sdk feat/web-containers/onboarding-initial-answers)",
    );
    await page.route(/\/api\/core\/orgs\/[^/]+\/metadata\//, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const res = await route.fetch();
      const body = (await res.json()) as { metadata?: Record<string, unknown> };
      return route.fulfill({
        response: res,
        json: { ...body, metadata: { ...body.metadata, sector: "k12" } },
      });
    });
    const org = await landedOrg(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(org)}/onboarding?flow=admin`);
    await expect(page.getByText("Invite your team")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-label", "Step 1 of 2");
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  });

  test("H10 · Management › Onboarding opens for the admin, its agent links based on this app's onboarding route", async ({
    page,
  }) => {
    const org = await landedOrg(page);
    await expect(page.getByRole("heading", { level: 1, name: /^Home\b/ })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "Management", exact: true }).click();
    const management = page.getByRole("dialog").filter({ hasText: "Management" }).first();
    await management
      .getByRole("tab", { name: "Onboarding" })
      .or(management.getByRole("button", { name: "Onboarding", exact: true }))
      .first()
      .click();
    // The copyable link shows once an agent is picked; until then the tab says so.
    const link = management.locator("code").filter({ hasText: "/onboarding/" }).first();
    const empty = management.getByText("No onboarding agent yet");
    await expect(link.or(empty).first()).toBeVisible({ timeout: 30_000 });
    if (await link.isVisible()) {
      expect(await link.textContent()).toMatch(
        new RegExp(`^${esc(appHost)}/platform/${esc(encodeURIComponent(org))}/onboarding/`),
      );
    } else {
      test.info().annotations.push({
        type: "note",
        description: "no onboarding agent picked on this platform: the link base is not shown",
      });
    }
    await page.keyboard.press("Escape");
  });
});

test.describe("a member's first run", () => {
  test.skip(noMember, NO_MEMBER);
  test.use({ storageState: memberState });

  test("H7 · a member is sent to the platform's form, answers it, sees the final step and lands home", async ({
    page,
  }) => {
    const form = {
      version: 1,
      enabled: true,
      title: "Welcome",
      sections: [
        {
          key: "about",
          title: "About you",
          fields: [{ key: "role", type: "text", label: "Your role", required: true }],
        },
      ],
      agents: [],
    };
    // The platform's metadata, with the form added on every read and the
    // member's answers kept once written — nothing reaches the platform.
    let written: Record<string, unknown> = {};
    await page.route(/\/api\/core\/orgs\/[^/]+\/metadata\//, async (route) => {
      const req = route.request();
      if (req.method() === "GET") {
        const res = await route.fetch();
        const body = (await res.json()) as { metadata?: Record<string, unknown> };
        return route.fulfill({
          response: res,
          json: { ...body, metadata: { ...body.metadata, ...written, user_onboarding_form: form } },
        });
      }
      const sent = req.postDataJSON() as { metadata?: Record<string, unknown> } | null;
      written = sent?.metadata ?? sent ?? {};
      return route.fulfill({ json: { metadata: written } });
    });
    await editListedMetadata(page, (metadata) => ({
      ...metadata,
      ...written,
      user_onboarding_form: form,
    }));
    const org = await landedOrg(page);
    await expect(page).toHaveURL(onboarding(org), { timeout: 30_000 });
    await page.getByLabel("Your role").fill("Student");
    await page.getByRole("button", { name: /^(Submit|Continue)$/ }).click();
    await expect(page.getByTestId("onboarding-final-step")).toContainText("All Set", {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(home(org), { timeout: 30_000 });
  });

  test("H8 · with nothing configured, /onboarding says so and Continue goes home", async ({
    page,
  }) => {
    const org = await landedOrg(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(org)}/onboarding`);
    const empty = page.getByTestId("user-onboarding-empty");
    await expect(empty).toBeVisible({ timeout: 30_000 });
    await empty.getByRole("button").click();
    await expect(page).toHaveURL(home(org), { timeout: 30_000 });
  });
});

test.describe("the session a $0 checkout returns to", () => {
  test("H15 · still on the community platform while the platform lists their own, the SDK moves them to it", async ({
    page,
  }) => {
    await page.route(/\/login\/complete\?/, (route) => route.fulfill(stub));
    const own = await landedOrg(page);
    const keys = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem("tenants") ?? "[]") as { key: string }[]).map((t) => t.key),
    );
    // The SDK's two-platform rule: a user holding exactly [main, X] is moved to X.
    expect(keys.sort()).toEqual([MAIN, own].sort());
    await page.evaluate((main) => {
      const entry = { key: main, org: main, platform_name: "ibl.ai", is_admin: false };
      localStorage.setItem("tenant", main);
      localStorage.setItem("current_tenant", JSON.stringify(entry));
      localStorage.setItem("tenants", JSON.stringify([entry]));
    }, MAIN);
    await page.goto(`${appHost}/`);
    await page.waitForURL(/\/login\/complete\?/, { timeout: 30_000 });
    expect(new URL(page.url()).searchParams.get("tenant")).toBe(own);
  });
});

test.describe("the credit menu's checkout", () => {
  test("H16 · Upgrade Plan asks for a pricing page that returns through the sign-in app", async ({
    page,
  }) => {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sis.iblai.me").replace(/\/+$/, "");
    let session = "";
    // The admin's platform behind the paywall, on a free trial: the badge offers Upgrade Plan.
    await page.route(/\/api\/core\/users\/platforms\//, async (route) => {
      const res = await route.fetch();
      const all = (await res.json()) as { key: string }[];
      await route.fulfill({
        response: res,
        json: all.map((p) => (p.key === MAIN ? p : { ...p, show_paywall: true })),
      });
    });
    await page.route(/\/api\/billing\/account\//, (route) =>
      route.fulfill({
        json: {
          platform_key: new URL(route.request().url()).searchParams.get("platform_key"),
          available_credits: 100,
          has_credits: true,
          current_plan: "Free Trial",
          free_trial: true,
        },
      }),
    );
    // Answered like the platform answers a refused return, so nothing navigates.
    await page.route(/\/stripe\/pricing-page-session\//, (route) => {
      session = route.request().url();
      return route.fulfill({ status: 400, json: { redirect_url: "stubbed" } });
    });
    const own = await landedOrg(page);
    // The badge reads the stored membership this first load wrote.
    await page.goto(`${appHost}/platform/${encodeURIComponent(own)}`);
    await page.getByRole("button", { name: /credits remaining/i }).click({ timeout: 30_000 });
    await page.getByRole("button", { name: "Upgrade Plan" }).click();
    await expect.poll(() => session).toContain("/stripe/pricing-page-session/");
    const back = new URL(new URL(session).searchParams.get("redirect_url") ?? "");
    expect(back.searchParams.get("app")).toBe("mentor");
    expect(back.searchParams.get("redirect-to")).toBe(appUrl);
  });
});
