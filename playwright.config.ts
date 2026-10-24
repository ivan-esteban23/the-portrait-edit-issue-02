import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
// Use Arch's packaged Chromium locally; CI uses Playwright's matched browser.
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (!process.env.CI && existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined);
const responsiveBrowsers: "chromium"[] = ["chromium"];

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  globalTimeout: 20 * 60 * 1000,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173/the-portrait-edit-issue-02/",
    headless: true,
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "small-phone-dark",
      use: {
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "phone-light",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "large-phone-dark",
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "tablet-light",
      use: {
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "tablet-landscape-dark",
      use: {
        viewport: { width: 1194, height: 834 },
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "desktop-dark",
      use: { viewport: { width: 1440, height: 1000 }, colorScheme: "dark" },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      name: "desktop-light",
      use: { viewport: { width: 1280, height: 900 }, colorScheme: "light" },
    },
    ...responsiveBrowsers.map((browserName) => ({
      name: `${browserName}-responsive`,
      testMatch: "**/{responsive-reader,archive-cards,viewport-audit}.spec.ts",
      use: {
        browserName,
        hasTouch: true,
        launchOptions: browserName === "chromium" ? { executablePath } : {},
      },
    })),
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
