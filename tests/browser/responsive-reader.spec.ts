import { test, expect, type Page } from "@playwright/test";
import { openReaderTools } from "./helpers/reader-tools";

const reader = "issues/the-prompt-issue/pages/60";
const screens = [
  { name: "small phone", width: 320, height: 740 },
  { name: "phone", width: 390, height: 844 },
  { name: "landscape phone", width: 844, height: 390 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "landscape tablet", width: 1194, height: 834 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
];

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

for (const screen of screens) {
  test(`${screen.name}: essential controls fit and optional tools remain accessible`, async ({
    page,
  }) => {
    await page.setViewportSize(screen);
    await page.goto(reader);
    const toolbar = page.locator("#reader-toolbar");
    await expect(toolbar).toBeVisible();
    const compact = screen.width < 1400 || screen.height <= 600;
    expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(
      compact && screen.height <= 600 ? 64 : 110,
    );
    await noOverflow(page);
    for (const control of await toolbar
      .locator("button, input, select")
      .all()) {
      if (!(await control.isVisible())) continue;
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(screen.width + 1);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const trigger = page.getByRole("button", { name: "Tools", exact: true });
    if (compact) {
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(
        page.getByRole("button", { name: "Toggle presentation slideshow" }),
      ).toBeHidden();
    }
    await openReaderTools(page);
    const bookmark = page.getByRole("button", {
      name: "Save study to bookmarks",
      exact: true,
    });
    await bookmark.click();
    await expect(
      page.getByRole("button", { name: "Remove study from saved bookmarks" }),
    ).toHaveAttribute("aria-pressed", "true");
    if (compact) {
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    await page.getByRole("button", { name: "Display", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Display & navigation" });
    await expect(settings).toBeVisible();
    await page
      .getByRole("combobox", { name: "Reading mode", exact: true })
      .selectOption("text");
    await page.getByRole("button", { name: "Close display settings" }).click();
    await expect(
      page.getByRole("button", { name: "Display", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".study-article")).toBeVisible();
    await page.getByLabel("Page number", { exact: true }).fill("61");
    await page.getByLabel("Page number", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/pages\/61$/);
    await noOverflow(page);
  });
}

test("rotation and resizing retain page, reading size, theme, and bookmarks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto(reader);
  await openReaderTools(page);
  await page
    .getByRole("button", { name: "Save study to bookmarks", exact: true })
    .click();
  await page.getByRole("button", { name: "Close tools", exact: true }).click();
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Reading mode", exact: true })
    .selectOption("text");
  await page.getByRole("button", { name: "20 px", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Color theme")
    .selectOption("sepia");
  await page.getByRole("button", { name: "Close display settings" }).click();
  for (const viewport of [
    { width: 1194, height: 834 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page).toHaveURL(/pages\/60$/);
    await expect(page.locator(".study-article")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
    await openReaderTools(page);
    await expect(
      page.getByRole("button", { name: "Remove study from saved bookmarks" }),
    ).toHaveAttribute("aria-pressed", "true");
    const close = page.getByRole("button", {
      name: "Close tools",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page.getByRole("button", { name: "Display", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "20 px", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Close display settings" }).click();
    await noOverflow(page);
  }
});

test("200 percent equivalent layout keeps keyboard navigation and dialogs usable", async ({
  page,
}) => {
  // Browser zoom reduces the CSS viewport; deviceScaleFactor alone does not.
  await page.setViewportSize({ width: 683, height: 384 });
  await page.goto(reader);
  await openReaderTools(page);
  await page
    .getByRole("button", { name: "Keyboard shortcuts", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Keyboard Shortcuts",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close shortcuts cheatsheet" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Keyboard shortcuts", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Tools", exact: true }),
  ).toBeFocused();
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/pages\/61$/);
  await noOverflow(page);
});
