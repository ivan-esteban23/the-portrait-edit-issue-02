import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
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
      name: "small-phone-dark",
      use: {
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      name: "phone-light",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      name: "large-phone-dark",
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      name: "tablet-light",
      use: {
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
        colorScheme: "light",
      },
    },
    {
      name: "tablet-landscape-dark",
      use: {
        viewport: { width: 1194, height: 834 },
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      name: "desktop-dark",
      use: { viewport: { width: 1440, height: 1000 }, colorScheme: "dark" },
    },
    {
      name: "desktop-light",
      use: { viewport: { width: 1280, height: 900 }, colorScheme: "light" },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
