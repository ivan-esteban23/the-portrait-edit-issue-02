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

test("publication links resume reading and contents opens the chapter directory", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portrait-edit-last-read",
      JSON.stringify({ "the-prompt-issue": 60 }),
    ),
  );
  await page.goto("./");
  const nav = page.getByRole("navigation", {
    name: "Publication",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Reader", exact: true }).click();
  await expect(page).toHaveURL(/pages\/60$/);
  await nav.getByRole("link", { name: "Reader", exact: true }).click();
  await expect(page).toHaveURL(/pages\/60$/);
  await nav.getByRole("link", { name: "Contents", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chapters", exact: true }),
  ).toBeFocused();
  await expect(
    nav.getByRole("link", { name: "Contents", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await nav.getByRole("link", { name: "Contents", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chapters", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("navigation", { name: "Issue chapters" })
    .getByRole("link")
    .nth(1)
    .click();
  await expect(
    nav.getByRole("link", { name: "Contents", exact: true }),
  ).not.toHaveAttribute("aria-current");
});

test("masthead archive return keeps a study's search context", async ({
  page,
}) => {
  await page.goto("prompts?q=moody");
  const first = page.locator(".archive-grid .study-card a").first();
  await first.click();
  await page
    .getByRole("navigation", { name: "Study shortcuts" })
    .getByRole("link", { name: /^Next:/ })
    .click();
  await page
    .getByRole("navigation", { name: "Publication", exact: true })
    .getByRole("link", { name: "Archive", exact: true })
    .click();
  await expect(page).toHaveURL(/prompts\?q=moody$/);
  await expect(page.getByRole("searchbox")).toHaveValue("moody");
  await expect(first).toBeFocused();
});

test("visible navigation fits narrow screens and study shortcuts respect boundaries", async ({
  page,
}) => {
  for (const width of [320, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("prompts/issue-02-study-001");
    const nav = page.getByRole("navigation", {
      name: "Publication",
      exact: true,
    });
    for (const link of await nav.getByRole("link").all()) {
      await expect(link).toBeInViewport();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const quick = page.getByRole("navigation", {
      name: "Study shortcuts",
    });
    await expect(quick.getByRole("link", { name: /^Previous:/ })).toHaveCount(
      0,
    );
    await quick.getByRole("link", { name: /^Next:/ }).click();
    await expect(page).toHaveURL(/study-002$/);
    await quick.getByRole("link", { name: /^Previous:/ }).click();
    await expect(page).toHaveURL(/study-001$/);
    await page.goto("prompts/issue-02-study-174");
    await expect(quick.getByRole("link", { name: /^Next:/ })).toHaveCount(0);
    await expect(quick).toContainText("Study 165 of 165");
  }
});
