import { expect, test } from "@playwright/test";
test("portrait suggestions support topics, keyboard navigation, and filtered archive return", async ({
  page,
}) => {
  await page.goto("./");
  const opener = page.getByRole("button", {
    name: "Search ⌘K, find studies",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Find a starting point." }),
    input = dialog.getByRole("searchbox", { name: "Search studies" });
  await expect(input).toBeFocused();
  await expect(
    dialog.getByRole("region", { name: "Lighting suggestions" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /^Soft light/ }).click();
  await expect(input).toHaveValue("soft light");
  await expect(dialog.getByRole("link")).toHaveCount(5);
  await input.fill("004");
  await expect(dialog.getByRole("link")).toHaveCount(1);
  await input.press("ArrowDown");
  await expect(dialog.getByRole("link")).toBeFocused();
  await dialog.getByRole("link").press("Enter");
  await expect(page.locator(".study-article h1")).toHaveText(
    "Studio Ponytail Portrait",
  );
  await page
    .getByRole("link", { name: "← Prompt archive", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toHaveValue("004");
  await expect(page.getByRole("status")).toHaveText("1 study");
  await page.goto("prompts?selection=studio&q=ponytail");
  await page
    .getByRole("button", { name: "Suggestions ↗", exact: true })
    .click();
  await expect(input).toHaveValue("ponytail");
  await input.fill("snow");
  await expect(dialog.getByText("No matching studies.")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Search all studies instead ↗" })
    .click();
  await expect(dialog.getByRole("link")).toHaveCount(5);
  await input.press("Enter");
  await expect(page).toHaveURL(/prompts\?q=snow$/);
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await input.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Search ⌘K, find studies", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Commands and page jumps ↗" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Command palette" }),
  ).toBeVisible();
  const portraitSearch = page.getByRole("button", {
    name: "Search portraits ↗",
    exact: true,
  });
  await portraitSearch.focus();
  await portraitSearch.press("Enter");
  await expect(dialog).toBeVisible();
  await input.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
