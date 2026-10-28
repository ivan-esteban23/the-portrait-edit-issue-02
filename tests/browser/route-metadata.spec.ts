import { expect, test } from "@playwright/test";
test("direct study metadata stays aligned after client navigation", async ({
  page,
}) => {
  await page.goto("prompts/issue-02-study-001/");
  await expect(page).toHaveTitle(
    "Study #1: Autumn Hat Portrait | The Portrait Edit",
  );
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute(
    "href",
    /\/the-portrait-edit-issue-02\/prompts\/issue-02-study-001\/$/,
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    "Study #1: Autumn Hat Portrait | The Portrait Edit",
  );
  await page.getByRole("link", { name: "Next study" }).click();
  await expect(canonical).toHaveAttribute(
    "href",
    /\/the-portrait-edit-issue-02\/prompts\/issue-02-study-002\/$/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    (await canonical.getAttribute("href")) as string,
  );
  const structured = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(structured!).url).toBe(
    await canonical.getAttribute("href"),
  );
  await page
    .getByRole("link", { name: "Prompt archive", exact: false })
    .last()
    .click();
  await expect(canonical).toHaveAttribute(
    "href",
    /\/the-portrait-edit-issue-02\/prompts\/$/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/social-card.png$/,
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
});
