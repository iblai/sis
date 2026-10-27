#!/usr/bin/env node
/**
 * Capture the README screenshots (docs/images/*.png) from a signed-in session.
 *
 * 1. pnpm e2e:accounts (or copy e2e/.env.development.example and fill in an admin of the platform).
 * 2. Run the auth setup once:  pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium
 * 3. pnpm screenshots --org <demo-platform-key> [--host http://localhost:3000]
 *
 * Uses the storage state saved by e2e/auth.setup.ts, so no credentials pass
 * through this script.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const host = opt("--host", process.env.APP_HOST || "http://localhost:3000");
const stateFile = opt("--state", "playwright/.auth/user-setup-chromium.json");
if (!fs.existsSync(stateFile)) {
  console.error(
    `No saved session at ${stateFile}. Run: pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium`,
  );
  process.exit(1);
}

// Name the platform: the captures land in the README, so only a seeded
// demo platform may ever be photographed — never whichever one the saved
// session happens to open.
const org = opt("--org", "");
if (!org) {
  console.error("Pass --org <demo-platform-key>; the captures are committed to docs/images.");
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: stateFile,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(host, { waitUntil: "networkidle" });
await page.waitForURL((u) => /\/platform\/[^/]+/.test(u.pathname), { timeout: 60_000 });
const base = `${host}/platform/${encodeURIComponent(org)}`;
fs.mkdirSync("docs/images", { recursive: true });

const shots = [
  ["home", ""],
  ["students", "/students"],
  ["courses", "/courses"],
  ["setup-terms", "/setup?tab=terms"],
];
for (const [name, route] of shots) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join("docs/images", `${name}.png`) });
  console.log(`saved docs/images/${name}.png`);
}

// A student page: the first row of the Students table.
await page.goto(`${base}/students`, { waitUntil: "networkidle" });
const firstRow = page.getByRole("row").nth(1);
if (await firstRow.count()) {
  await firstRow.getByRole("link").first().click();
  await page.waitForURL((u) => /\/students\/[^/]+/.test(u.pathname), { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/images/student.png" });
  console.log("saved docs/images/student.png");
}
await browser.close();
