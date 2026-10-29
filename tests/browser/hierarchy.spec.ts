import { expect, test } from "@playwright/test";

test("issue reading action precedes the cover and chapters remain reachable", async ({
  page,
}) => {
  await page.goto("issues/the-prompt-issue");
  const reading = page.getByRole("link", {
    name: "Start reading",
    exact: true,
  });
  const cover = page.locator(".overview-cover");
  await expect(reading).toHaveAttribute(
    "href",
    /issues\/the-prompt-issue\/pages\/1$/,
  );
  expect(
    await reading.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(document.querySelector(".overview-cover")!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /Browse chapters/ }).click();
  await expect(page.getByRole("heading", { name: "Chapters" })).toBeFocused();
  await expect(cover).toBeVisible();
});

test("study identity and prompt precede navigation while archive return is retained", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portrait-edit-saved",
      JSON.stringify(["issue-02-study-001"]),
    ),
  );
  await page.goto("prompts?saved=1");
  const card = page.locator(".archive-grid .study-card").first();
  await card.locator("a").first().click();
  const title = page.locator(".study-article h1");
  await expect(title).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Image Prompt", level: 2 }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Study navigation" });
  expect(
    await title.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(
          document.querySelector(".study-sequence-nav")!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await expect(nav).toBeVisible();
  await page.getByRole("link", { name: /Prompt archive/ }).click();
  await expect(page).toHaveURL(/saved=1/);
});
