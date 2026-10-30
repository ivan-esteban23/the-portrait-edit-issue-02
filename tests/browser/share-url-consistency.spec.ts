import { expect, test } from "@playwright/test";

test("archive native share uses the same study URL as the card link", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.sharedUrl = data.url;
      },
    });
  });
  await page.goto("prompts");
  const card = page.locator(".archive-grid .study-card").first();
  const href = await card.locator("a.study-card-overlay").getAttribute("href");
  expect(href).toMatch(
    /\/the-portrait-edit-issue-02\/prompts\/issue-02-study-001$/,
  );
  await card.getByRole("button", { name: /^More actions for Study/ }).click();
  await card.getByRole("button", { name: "Share study" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared-url",
    new URL(href!, page.url()).href,
  );
  await page.goto(
    (await page.locator("html").getAttribute("data-shared-url"))!,
  );
  await expect(page.locator(".study-article h1")).toBeVisible();
});
