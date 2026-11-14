import { expect, test } from "@playwright/test";

test("existing collections organize, compare and undo without losing saved portraits", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("portrait-test-seeded")) {
      localStorage.setItem(
        "portrait-edit-collections",
        JSON.stringify({
          Default: ["issue-02-study-004"],
          Existing: ["issue-02-study-013"],
        }),
      );
      localStorage.setItem("portrait-edit-active-collection", "Default");
      localStorage.setItem("portrait-test-seeded", "1");
    }
  });
  await page.goto("saved/");
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page.getByLabel("New collection", { exact: true }).fill("Soft light");
  await page
    .getByRole("button", { name: "Create collection +", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soft light", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /All saved/ }).click();
  await page.locator(".library-select input").nth(0).check();
  await page.locator(".library-select input").nth(1).check();
  await page
    .getByRole("button", { name: "Compare selected (2/2)", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Add selected to", exact: true })
    .selectOption("Soft light");
  await page
    .getByRole("button", { name: "Add to collection", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Saved collections", exact: true })
    .getByRole("link", { name: /Soft light/ })
    .click();
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove from collection", exact: true })
    .first()
    .click();
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Delete collection", exact: true })
    .click();
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".library-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Read prompt ↗", exact: true })
    .first()
    .click();
  await expect(page.locator(".masthead")).toHaveCount(0);
  await page.getByRole("link", { name: "Exit reading", exact: false }).click();
  await expect(page).toHaveURL(/\/saved$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("focused reading preserves raw prompt, reference control and study context", async ({
  page,
}) => {
  await page.goto("prompts/issue-02-study-004?from=issue-02-study-013");
  await page
    .getByRole("link", { name: "Focused reading ↗", exact: true })
    .click();
  await expect(page.locator(".masthead")).toHaveCount(0);
  await expect(page.locator(".reading-prompt-text")).toContainText(
    "A minimalist studio portrait",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedPrompt: string }).copiedPrompt = text;
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedPrompt: string }).copiedPrompt,
    ),
  ).toBe(await page.locator(".reading-prompt-text").textContent());
  await page.getByLabel("Text size").selectOption("24");
  await expect(page.locator(".reading-prompt-text")).toHaveCSS(
    "font-size",
    "24px",
  );
  await page
    .getByRole("button", { name: "Hide reference", exact: true })
    .click();
  await expect(page.locator(".reading-layout figure")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show reference", exact: true })
    .click();
  await expect(page.locator(".reading-layout figure img")).toBeVisible();
  await page.getByRole("link", { name: "Exit reading", exact: false }).click();
  await expect(page).toHaveURL(/study-004\?from=issue-02-study-013$/);
  await expect(page.locator(".masthead")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("study links expose the landscape sharing card and canonical public URL", async ({
  page,
  request,
}) => {
  await page.goto("prompts/issue-02-study-004/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/social\/studies\/issue-02-study-004.jpg$/,
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    page.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "630");
  await page
    .getByRole("button", { name: "Preview sharing card ↗", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Public study link", { exact: true }),
  ).toHaveValue(/\/prompts\/issue-02-study-004$/);
  await expect(dialog.locator(".share-landscape")).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator(".share-landscape")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(1200);
  expect(
    (
      await request.get(
        (await dialog.locator(".share-landscape").getAttribute("src"))!,
      )
    ).status(),
  ).toBe(200);
  await dialog
    .getByRole("button", { name: "Portrait / Pinterest", exact: true })
    .click();
  await expect(dialog.locator(".share-portrait-card img")).toBeVisible();
  await dialog.getByRole("button", { name: "Close ×", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview sharing card ↗", exact: true }),
  ).toBeFocused();
});
