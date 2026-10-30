import { expect, test } from "@playwright/test";

test("masthead indicates the current section while moving between archive, study and reader pages", async ({
  page,
}) => {
  await page.goto("prompts");
  const archive = page.getByRole("link", { name: "Archive", exact: true });
  const reader = page.getByRole("link", { name: "Reader", exact: true });
  await expect(archive).toHaveAttribute("aria-current", "page");
  await expect(reader).not.toHaveAttribute("aria-current");
  await page.locator(".archive-grid .study-card a").first().click();
  await expect(archive).toHaveClass(/is-active/);
  await page
    .getByRole("link", { name: /Read in the issue/ })
    .first()
    .click();
  await expect(reader).toHaveAttribute("aria-current", "location");
  await expect(reader).toHaveClass(/is-active/);
  await expect(archive).not.toHaveAttribute("aria-current");
  await page
    .locator(".reader-bottom")
    .getByRole("button", { name: /Next/ })
    .click();
  await expect(reader).toHaveAttribute("aria-current", "location");
  await page.goBack();
  await expect(page).toHaveURL(/\/prompts\/issue-02-study-/);
  await expect(archive).toHaveClass(/is-active/);
});
