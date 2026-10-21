import { test, expect } from "@playwright/test";
import { openReaderTools } from "./helpers/reader-tools";

test("homepage routes readers into the magazine, archive, and saved collection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "portrait-edit-last-read",
      JSON.stringify({ "the-prompt-issue": 60 }),
    );
    localStorage.setItem(
      "portrait-edit-saved",
      JSON.stringify(["issue-02-study-001"]),
    );
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Make the issue yours" }),
  ).toBeVisible();
  const home = page.url();
  await page.getByRole("link", { name: /Continue on page 60/ }).click();
  await expect(page).toHaveURL(/pages\/60$/);
  await page.goto(home);
  await page.getByRole("link", { name: /Browse 168 studies/ }).click();
  await expect(
    page.getByRole("heading", { name: "Portrait prompts" }),
  ).toBeVisible();
  await page.goto(home);
  await page.getByRole("link", { name: /Your saved studies \(1\)/ }).click();
  await expect(page).toHaveURL(/prompts\?saved=1$/);
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("study and reader links work without native sharing and open the exact destination", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedLink = text;
        },
      },
    });
  });
  await page.goto("prompts/issue-02-study-001");
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link copied" }),
  ).toBeVisible();
  const studyLink = await page.locator("html").getAttribute("data-copied-link");
  expect(studyLink).toMatch(
    /\/the-portrait-edit-issue-02\/prompts\/issue-02-study-001$/,
  );
  await page.goto(studyLink!);
  await expect(
    page.getByRole("button", { name: "Copy link", exact: true }),
  ).toBeVisible();
  await page.goto("issues/the-prompt-issue/pages/60");
  await openReaderTools(page);
  await page
    .getByRole("button", { name: "Copy page link", exact: true })
    .click();
  const pageLink = await page.locator("html").getAttribute("data-copied-link");
  expect(pageLink).toMatch(
    /\/the-portrait-edit-issue-02\/issues\/the-prompt-issue\/pages\/60$/,
  );
  await page.goto(pageLink!);
  await expect(page.getByLabel("Page number", { exact: true })).toHaveValue(
    "60",
  );
  // Copy feedback must not push the wide toolbar onto another row.
  await page.setViewportSize({ width: 1920, height: 1080 });
  const toolbar = page.locator("#reader-toolbar");
  const copyPageLink = page.getByRole("button", {
    name: "Copy page link",
    exact: true,
  });
  await expect(copyPageLink).toBeVisible();
  expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(110);
  await copyPageLink.click();
  await expect(toolbar.getByRole("status")).toHaveText("Link copied");
  expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(110);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
