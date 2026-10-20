import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const responsiveBrowsers: ("chromium" | "firefox" | "webkit")[] = [
  "chromium",
  "firefox",
];
// WebKit remains available for a later validation pass without blocking Linux QA.
if (process.env.PLAYWRIGHT_WEBKIT === "1") responsiveBrowsers.push("webkit");

export default defineConfig({
  testDir: "tests/browser",
  timeout: 30000,
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173/the-portrait-edit-issue-02/",
    headless: true,
    launchOptions: existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium" }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "small-phone-dark",
      use: {
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "phone-light",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "large-phone-dark",
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "tablet-light",
      use: {
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "tablet-landscape-dark",
      use: {
        viewport: { width: 1194, height: 834 },
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "desktop-dark",
      use: { viewport: { width: 1440, height: 1000 }, colorScheme: "dark" },
    },
    {
      testIgnore: "**/{responsive-reader,archive-cards}.spec.ts",
      name: "desktop-light",
      use: { viewport: { width: 1280, height: 900 }, colorScheme: "light" },
    },
    ...responsiveBrowsers.map((browserName) => ({
      name: `${browserName}-responsive`,
      testMatch: "**/{responsive-reader,archive-cards}.spec.ts",
      use: {
        browserName,
        launchOptions:
          browserName === "chromium" && existsSync("/usr/bin/chromium")
            ? { executablePath: "/usr/bin/chromium" }
            : {},
      },
    })),
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
