import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, ".env.development"),
});

const APP_HOST = process.env.APP_HOST || "http://localhost:3000";

/**
 * Playwright configuration.
 *
 * Auth setup runs once per browser (setup projects), saves storage state,
 * then journey tests inherit the pre-authenticated state.
 *
 * To run tests:
 *   pnpm test:e2e              # headless, all browsers
 *   pnpm test:e2e:ui           # interactive UI
 *   pnpm test:e2e:headed       # headed browser
 *
 * Edit e2e/.env.development to configure APP_HOST and credentials.
 */
export default defineConfig({
  testDir: ".",
  // The admin home waits ~25 s for the DM overview reads on a busy platform.
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL: APP_HOST,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup — one per browser, runs once and saves storage state
    { name: "setup-chromium", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "setup-firefox", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Firefox"] } },
    { name: "setup-webkit", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Safari"] } },

    // Journey tests — run with pre-authenticated storage state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user-setup-chromium.json",
      },
      dependencies: ["setup-chromium"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: ["journeys/mobile.journey.spec.ts"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/user-setup-firefox.json",
      },
      dependencies: ["setup-firefox"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: ["journeys/mobile.journey.spec.ts"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/user-setup-webkit.json",
      },
      dependencies: ["setup-webkit"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: ["journeys/mobile.journey.spec.ts"],
    },

    // Phones — one Chromium device on the chromium session; the mobile journey only.
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        storageState: "playwright/.auth/user-setup-chromium.json",
      },
      dependencies: ["setup-chromium"],
      testMatch: ["journeys/mobile.journey.spec.ts"],
    },
  ],
});
