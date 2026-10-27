import { test, expect, type ConsoleMessage } from "@playwright/test";
import {
  STUDENT,
  appHost,
  open,
  openProfileMenu,
  platformOf,
  seeded,
  setAdminMode,
} from "../helpers";

/**
 * Shell journey — the SDK shell around the SIS pages: sidebar, top bar,
 * ⌘K, the Admin/User switch, the profile menu and its SDK dialogs, the
 * footer cluster, the language select, console hygiene, and sign-out.
 * Requires auth.setup.ts and a platform admin on a throwaway platform.
 */
const stamp = Date.now().toString(36);
const seed = seeded();
const cmdK = process.platform === "darwin" ? "Meta+k" : "Control+k";
const cmdB = process.platform === "darwin" ? "Meta+b" : "Control+b";

test.describe("shell journey", () => {
  test("S1 · the sidebar reaches every admin row", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    for (const [label, path] of [
      ["Students", "students"],
      ["Staff", "staff"],
      ["Courses", "courses"],
      ["Groups", "groups"],
      ["Grades", "grades"],
      ["Credentials", "credentials"],
      ["Reports", "reports"],
      ["Messages", "messages"],
    ] as const) {
      // Sidebar rows are buttons (the SDK shell navigates on click).
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await page.waitForURL(
        (url) => url.pathname.endsWith(`/platform/${encodeURIComponent(platform)}/${path}`),
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { level: 1, name: new RegExp(`^${label}\\b`) }),
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("S2 · ⌘K lists the groups and the create actions", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    await page.keyboard.press(cmdK);
    await expect(page.getByPlaceholder(/search students, staff and courses/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("dialog").getByRole("option", { name: "Invite Student" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("S3 · the shell names the current platform and the profile menu opens", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    // The breadcrumb root is the platform's name; the SDK menu names it only in a switcher that needs several platforms.
    const expected: string = await page.evaluate((key) => {
      const t = JSON.parse(localStorage.getItem("tenants") ?? "[]").find(
        (x: { key: string }) => x.key === key,
      );
      return t?.platform_name || t?.name || t?.org || "";
    }, platform);
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs).toBeVisible({ timeout: 10_000 });
    if (expected) await expect(crumbs).toContainText(expected);
    const menu = await openProfileMenu(page);
    await expect(menu.getByRole("menuitem", { name: /log ?out|sign out/i })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("S4 · Setup is hidden outside Admin mode and /setup redirects home", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    await expect(page.getByRole("button", { name: "Setup", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await setAdminMode(page, false);
    await expect(page.getByRole("button", { name: "Setup", exact: true })).toHaveCount(0);
    await page.goto(`${appHost}/platform/${encodeURIComponent(platform)}/setup`);
    await page.waitForURL(
      (url) =>
        url.pathname === `/platform/${encodeURIComponent(platform)}` ||
        url.pathname === `/platform/${encodeURIComponent(platform)}/`,
      { timeout: 15_000 },
    );
  });

  test("S5 · the home period select asks the overview for that window", async ({ page }) => {
    await open(page, "", /^Home\b/);
    const request = page.waitForRequest(
      (req) => req.url().includes("/api/overview/orgs/") && req.url().includes("start_date="),
      { timeout: 20_000 },
    );
    await page.getByRole("combobox", { name: /period/i }).click();
    await page
      .getByRole("listbox")
      .getByRole("option", { name: /last 7 days/i })
      .click();
    await request;
  });

  test("S7 · the footer's Management opens the Management dialog, not a page", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    await page.getByRole("button", { name: "Management", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Management", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(
      `/platform/${encodeURIComponent(platform)}/groups`,
    );
    await page.keyboard.press("Escape");
  });

  test("S8 · ⌘B collapses the sidebar to its rail, the state survives a reload, ⌘B expands it", async ({
    page,
    context,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await page.keyboard.press(cmdB);
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    const cookie = (await context.cookies()).find((c) => c.name === "sidebar_state");
    expect(cookie?.value).toBe("false");
    await page.reload();
    await expect(page.locator('[data-slot="sidebar"]').first()).toHaveAttribute(
      "data-state",
      "collapsed",
      { timeout: 30_000 },
    );
    await page.keyboard.press(cmdB);
    await expect(page.locator('[data-slot="sidebar"]').first()).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  test("S9 · the logo goes to the platform home", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, "") === `/platform/${encodeURIComponent(platform)}`,
      { timeout: 15_000 },
    );
  });

  test("S10 · a student record's breadcrumbs read platform › Students › name and lead back", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, `/students/${encodeURIComponent(STUDENT)}`);
    const platform = platformOf(page);
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link").first()).toHaveAttribute(
      "href",
      new RegExp(`/platform/${encodeURIComponent(platform)}/?$`),
    );
    await expect(crumbs.getByRole("link", { name: "Students" })).toBeVisible();
    await expect(crumbs.locator("[aria-current='page']")).toHaveText(/\S/);
  });

  test("S11 · the top bar holds its six controls and never overflows the viewport", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible();
    await expect(header.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    await expect(header.getByRole("switch", { name: "Admin Mode" })).toBeVisible();
    await expect(header.getByRole("combobox", { name: "Language" })).toBeVisible();
    await expect(header.getByRole("button", { name: /notification/i })).toBeVisible();
    await expect(header.getByRole("button", { name: "More options" })).toBeVisible();
    const [scroll, client] = await header.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test("S12 · ⌘K navigates from Go To, Escape closes it, and the sidebar Search reopens it", async ({
    page,
  }) => {
    await open(page, "/staff", /^Staff\b/);
    await page.keyboard.press(cmdK);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("option", { name: "Groups", exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith("/groups"), { timeout: 15_000 });
    await page.keyboard.press(cmdK);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Search", exact: true }).first().click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("S13 · ⌘K Create opens the New Group dialog and a typed course name lists the course", async ({
    page,
  }) => {
    test.skip(!seed, "run the setup project first");
    await open(page, "/staff", /^Staff\b/);
    await page.keyboard.press(cmdK);
    await page.getByRole("dialog").getByRole("option", { name: "New Group", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("new") === "1", { timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "New Group" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press(cmdK);
    await page.getByPlaceholder(/search students, staff and courses/i).fill(seed!.courseName);
    await expect(
      page.getByRole("dialog").getByRole("option", { name: seed!.courseName }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
  });

  test("S14 · User mode shows the member's shell, survives a reload, and Admin brings the rows back", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    try {
      await setAdminMode(page, false);
      for (const label of ["Home", "Courses", "Details"] as const) {
        await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeVisible();
      }
      await expect(page.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Setup", exact: true })).toHaveCount(0);
      await open(page, "/courses", /^Courses\b/);
      await expect(page.getByText("The courses you are enrolled in")).toBeVisible();
      // The choice is kept per platform (regression for the reload that came back as Admin).
      await page.reload();
      await expect(page.getByRole("switch", { name: "Admin Mode" })).not.toBeChecked({
        timeout: 30_000,
      });
      expect(
        await page.evaluate((key) => localStorage.getItem(`sis:user-mode:${key}`), platform),
      ).toBe("1");
      await expect(page.getByRole("button", { name: "Students", exact: true })).toHaveCount(0);
    } finally {
      await setAdminMode(page, true);
    }
    await expect(page.getByRole("button", { name: "Students", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Setup", exact: true })).toBeVisible();
  });

  test("S15 · the profile menu lists Profile, Account, Help and Log Out, with no platform switcher", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const menu = await openProfileMenu(page);
    for (const item of ["Profile", "Account", "Help", "Log Out"]) {
      await expect(menu.getByRole("menuitem", { name: item, exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("menuitem", { name: /switch/i })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("S16 · Profile opens the SDK profile dialog with its tabs, the prefilled identity and tab ARIA", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const menu = await openProfileMenu(page);
    await menu.getByRole("menuitem", { name: "Profile", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /profile/i });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    for (const tab of [/basic/i, /social/i, /education/i, /experience/i, /security/i]) {
      await expect(dialog.getByRole("tab", { name: tab }).first()).toBeVisible();
    }
    await expect(dialog.getByRole("tab", { selected: true }).first()).toBeVisible();
    await expect(dialog.getByRole("tablist").first()).toBeVisible();
    await expect(dialog.getByLabel(/full name/i).first()).not.toHaveValue("");
    await expect(dialog.getByLabel(/email/i).first()).toHaveValue(/@/);
    await expect(dialog.getByRole("combobox", { name: /language/i }).first()).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("S17 · the profile's Title saves, reopens with the new value, and is set back", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const openDialog = async () => {
      const menu = await openProfileMenu(page);
      await menu.getByRole("menuitem", { name: "Profile", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: /profile/i });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      return dialog;
    };
    let dialog = await openDialog();
    const title = () => dialog.getByLabel(/^title/i).first();
    const before = await title().inputValue();
    const save = () => dialog.getByRole("button", { name: /save/i }).first();
    try {
      await title().fill(`E2E ${stamp}`);
      await save().click();
      await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
      await page.reload();
      dialog = await openDialog();
      await expect(title()).toHaveValue(`E2E ${stamp}`, { timeout: 15_000 });
    } finally {
      await title().fill(before);
      await save().click();
      await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
    }
  });

  test("S18 · Help opens the help center in a new tab", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const menu = await openProfileMenu(page);
    const popup = page.waitForEvent("popup");
    await menu.getByRole("menuitem", { name: "Help", exact: true }).click();
    const help = await popup;
    expect(help.url()).toMatch(/^https?:\/\//);
    await help.close();
  });

  test("S19 · the footer's Notifications, Invites and Support reach the inbox, the invite dialog and the docs", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const support = page
      .getByRole("link", { name: "Support", exact: true })
      .or(page.getByRole("button", { name: "Support", exact: true }));
    await expect(support.first()).toBeVisible();
    if ((await page.getByRole("link", { name: "Support", exact: true }).count()) > 0) {
      await expect(page.getByRole("link", { name: "Support", exact: true })).toHaveAttribute(
        "href",
        /^https?:\/\//,
      );
    }
    await page.getByRole("button", { name: "Invites", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith("/notifications"), { timeout: 15_000 });
  });

  test("S20 · the profile menu's Account opens the SDK account dialog", async ({ page }) => {
    await open(page, "/groups", /^Groups\b/);
    const menu = await openProfileMenu(page);
    await menu.getByRole("menuitem", { name: "Account", exact: true }).click();
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
  });

  test("S21 · Management finds the e2e student and View profile opens their profile", async ({
    page,
  }) => {
    test.skip(!STUDENT, "no student account in e2e/.env.development");
    await open(page, "/groups", /^Groups\b/);
    await page.getByRole("button", { name: "Management", exact: true }).click();
    const management = page.getByRole("dialog").filter({ hasText: "Management" }).first();
    await management.getByRole("textbox", { name: /search users/i }).fill(STUDENT);
    const view = page.getByRole("button", { name: /^View profile for / }).first();
    await expect(view).toBeVisible({ timeout: 30_000 });
    await view.click();
    await expect(page.getByRole("dialog", { name: /user profile/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  test("S22 · the language select switches the app to Spanish and back", async ({
    page,
    context,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const select = page.getByRole("combobox", { name: "Language" });
    await expect(select).toBeEnabled({ timeout: 30_000 });
    try {
      await select.selectOption("es");
      await expect(page.getByRole("button", { name: "Inicio", exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("es");
    } finally {
      await page.getByRole("combobox", { name: "Idioma" }).or(select).first().selectOption("en");
      await expect(page.getByRole("button", { name: "Home", exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
    }
    expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("en");
  });

  test("S23 · the home and every admin list render without console errors", async ({ page }) => {
    test.setTimeout(240_000);
    // Only what a run proved benign goes here, named: a 4xx the app handles is logged by
    // Chrome as a resource failure and is not a render error (the refused URL is annotated).
    const IGNORED: RegExp[] = [
      /Failed to load resource: the server responded with a status of 4\d\d/,
    ];
    page.on("response", (res) => {
      if (res.status() >= 400)
        test
          .info()
          .annotations.push({ type: "refused", description: `${res.status()} ${res.url()}` });
    });
    const errors: string[] = [];
    const onConsole = (msg: ConsoleMessage) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (!IGNORED.some((re) => re.test(text))) errors.push(`${page.url()}: ${text}`);
    };
    page.on("console", onConsole);
    try {
      await open(page, "", /^Home\b/);
      for (const [path, heading] of [
        ["/students", "Students"],
        ["/staff", "Staff"],
        ["/courses", "Courses"],
        ["/groups", "Groups"],
        ["/grades", "Grades"],
        ["/credentials", "Credentials"],
        ["/reports", "Reports"],
        ["/messages", "Messages"],
      ] as const) {
        await open(page, path, new RegExp(`^${heading}\\b`));
      }
    } finally {
      page.off("console", onConsole);
    }
    expect(errors).toEqual([]);
  });

  test("S24 · Log Out clears the session and leaves for the Auth SPA with the platform and a way back", async ({
    page,
  }) => {
    await open(page, "/groups", /^Groups\b/);
    const platform = platformOf(page);
    // The Auth SPA's logout is answered locally so the shared session is never revoked.
    await page.route(/\/logout/, (route) => route.fulfill({ status: 200, body: "signed out" }));
    const logoutRequest = page.waitForRequest((req) => /\/logout/.test(req.url()), {
      timeout: 30_000,
    });
    const menu = await openProfileMenu(page);
    await menu.getByRole("menuitem", { name: "Log Out", exact: true }).click();
    const logout = new URL((await logoutRequest).url());
    expect(logout.origin).not.toBe(appHost);
    expect(logout.searchParams.get("tenant")).toBe(platform);
    expect(logout.searchParams.get("redirect-to") ?? "").toContain(appHost);
    // Without a session, the next visit is sent to sign in: the tokens are gone.
    const probe = await page.context().newPage();
    const [login] = await Promise.all([
      probe.waitForRequest(
        (req) => req.url().includes("/login") && req.url().includes("redirect-to="),
        { timeout: 60_000 },
      ),
      probe.goto(appHost),
    ]);
    expect(new URL(login.url()).searchParams.get("tenant")).toBe(platform);
    await probe.close();
  });
});
