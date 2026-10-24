import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  await page.addInitScript(
    (theme) => localStorage.setItem("portrait-edit-theme", theme),
    info.project.use.colorScheme === "light" ? "light" : "dark",
  );
});

test("study actions preserve exact copy, expose full labels, and report failures", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          const state = window as Window & {
            copied?: string;
            rejectCopy?: boolean;
          };
          if (state.rejectCopy) throw new Error("Clipboard blocked");
          state.copied = text;
        },
      },
    });
  });
  await page.goto("prompts/issue-02-study-005");
  const card = page.getByRole("region", { name: "Image prompt", exact: true });
  await expect(
    page.getByRole("button", { name: "Customize prompt", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Download recipe card", exact: true }),
  ).toHaveCount(0);
  const raw = await card.locator(".prompt-body").textContent();
  await card.getByRole("button", { name: "Copy prompt", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { copied?: string }).copied),
    )
    .toBe(raw);
  const more = card.locator("summary");
  await more.focus();
  await page.keyboard.press("Enter");
  for (const name of [
    "Copy as Markdown",
    "Copy with parameters",
    "Copy Discord /imagine",
    "Download recipe card",
  ]) {
    await expect(card.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await card
    .getByRole("button", { name: "Copy as Markdown", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(
    card.getByRole("button", { name: "Copy as Markdown", exact: true }),
  ).toHaveCount(0);
  await more.click();
  await card
    .getByRole("button", { name: "Copy as Markdown", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { copied?: string }).copied),
    )
    .toMatch(/^### /);
  await expect(more).toBeFocused();
  await page.evaluate(() => {
    (window as Window & { rejectCopy?: boolean }).rejectCopy = true;
    document.execCommand = () => false;
  });
  await more.click();
  await card
    .getByRole("button", { name: "Copy with parameters", exact: true })
    .click();
  await expect(card.getByRole("status")).toHaveText(
    "Copy unavailable. Select the prompt text to copy it.",
  );
  await expect(more).toBeFocused();
  await more.click();
  const download = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Download recipe card", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(card.getByRole("status")).toHaveText(
    "Recipe card PNG exported.",
  );
  await more.click();
  await card
    .getByRole("button", { name: "Analyze prompt", exact: true })
    .click();
  await more.click();
  await expect(
    card.getByRole("button", { name: "Analyze prompt", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("phone tag picker fits landscape, restores focus, and preserves other filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto("prompts?q=portrait&model=Unspecified&ar=none");
  const more = page.getByRole("button", { name: /^More tags/ });
  await more.click();
  const dialog = page.getByRole("dialog", { name: "Browse tags" });
  await dialog
    .getByRole("searchbox", { name: "Find a tag" })
    .fill("victorian-inspired");
  await dialog.getByRole("button", { name: /^#victorian-inspired/ }).click();
  const done = dialog.getByRole("button", { name: "Done", exact: true });
  await expect(done).toBeInViewport();
  await done.click();
  await expect(more).toBeFocused();
  await expect(dialog).toHaveCount(0);
  await more.click();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();
  const params = new URL(page.url()).searchParams;
  expect(Object.fromEntries(params)).toEqual({
    q: "portrait",
    model: "Unspecified",
    ar: "none",
    tag: "victorian-inspired",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
