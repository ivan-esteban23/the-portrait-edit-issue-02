import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.use.colorScheme === "light" ? "light" : "dark";
  await page.addInitScript((value) => {
    localStorage.setItem("portrait-edit-theme", value);
  }, theme);
});

test("archive search tolerates whitespace and supports exact multiword hashtags", async ({
  page,
}) => {
  await page.goto("prompts");
  const search = page.getByRole("searchbox");
  const status = page.getByRole("status");
  await search.fill("moody");
  await expect(status).toHaveText("16 studies");
  await search.fill("  MOODY  ");
  await expect(status).toHaveText("16 studies");
  await search.fill("#moody");
  await expect(status).toHaveText("14 studies");
  await page.reload();
  await expect(search).toHaveValue("#moody");
  await expect(status).toHaveText("14 studies");
  await search.fill("#dark romantic");
  await expect(status).toHaveText("2 studies");
  await search.fill("#unknown");
  await expect(status).toHaveText("0 studies");
  await search.fill("   ");
  await expect(status).toHaveText("165 studies");
});

test("study return and native Back preserve archive filters, disclosure, scroll, and focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "portrait-edit-saved",
      JSON.stringify(["issue-02-study-001", "issue-02-study-006"]),
    );
  });
  const query = "?q=portrait&tag=moody&model=Unspecified&ar=none&saved=1";
  await page.goto(`prompts${query}`);
  const more = page.getByRole("button", { name: /^More tags/ });
  await more.click();
  const card = page.getByRole("link", {
    name: "View study Autumn Hat Portrait",
    exact: true,
  });
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  const scrollY = await page.evaluate(() => window.scrollY);
  await card.press("Enter");
  await expect(page).toHaveURL(/prompts\/issue-02-study-001$/);
  // Full-issue sequencing remains unchanged, even when the next study is outside the filter.
  await page.getByRole("link", { name: /Next study/ }).click();
  await expect(page).toHaveURL(/prompts\/issue-02-study-002$/);
  await expect(
    page.getByRole("heading", {
      name: "Golden Hour Street Selfie",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Next study/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/prompts\/issue-02-study-003$/);
  await page.getByRole("link", { name: "← Prompt archive" }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname.endsWith("/prompts") && url.search === query,
  );
  await expect(page.getByRole("searchbox")).toHaveValue("portrait");
  await expect(page.getByRole("status")).toHaveText("2 studies");
  await expect(
    page.getByRole("button", { name: "Fewer tags" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(card).toBeFocused();
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollY),
    )
    .toBeLessThan(3);
  await card.press("Enter");
  await expect(page).toHaveURL(/prompts\/issue-02-study-001$/);
  await page.goBack();
  await expect(page.getByRole("status")).toHaveText("2 studies");
  await expect(card).toBeFocused();
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollY),
    )
    .toBeLessThan(3);
});

test("direct study visits have a safe archive fallback", async ({ page }) => {
  await page.goto("prompts/issue-02-study-001");
  await expect(
    page.getByRole("link", { name: "← Prompt archive" }),
  ).toHaveAttribute("href", "/the-portrait-edit-issue-02/prompts");
  await page.getByRole("link", { name: "← Prompt archive" }).click();
  await expect(page.getByRole("status")).toHaveText("165 studies");
});

test("Undo exists only while visible and restores focus after expiry", async ({
  page,
}) => {
  await page.goto("prompts");
  const undo = page.getByRole("button", { name: "Undo", includeHidden: true });
  await expect(undo).toHaveCount(0);
  const save = page.getByRole("button", { name: "Save Study 1", exact: true });
  await save.click();
  const remove = page.getByRole("button", {
    name: "Remove Study 1 from saved",
    exact: true,
  });
  await remove.click();
  await expect(undo).toBeVisible();
  await undo.focus();
  await undo.press("Enter");
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await expect(undo).toHaveCount(0);
  await remove.click();
  await undo.focus();
  await expect(undo).toHaveCount(0, { timeout: 6000 });
  await expect(save).toBeFocused();
});
