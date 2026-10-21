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
      // Round subpixel layout values before asserting the 44px touch target.
      expect(Math.round(box.width * 100) / 100).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.height * 100) / 100).toBeGreaterThanOrEqual(44);
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
    .selectOption("light");
  await page.getByRole("button", { name: "Close display settings" }).click();
  for (const viewport of [
    { width: 1194, height: 834 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page).toHaveURL(/pages\/60$/);
    await expect(page.locator(".study-article")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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

test("Prompt Studio actions stay inside the drawer from phones through 8K displays", async ({
  page,
}) => {
  const viewports = [
    { name: "small phone", width: 320, height: 568 },
    { name: "phone screenshot", width: 494, height: 650 },
    { name: "720p", width: 1280, height: 720 },
    { name: "1080p", width: 1920, height: 1080 },
    { name: "1440p", width: 2560, height: 1440 },
    { name: "4K", width: 3840, height: 2160 },
    { name: "5K", width: 5120, height: 2880 },
    { name: "8K", width: 7680, height: 4320 },
  ];
  await page.goto("prompts/issue-02-study-005");
  await page
    .getByRole("button", { name: "Adjust Parameters", exact: true })
    .click();
  const studio = page.getByRole("dialog", {
    name: "Prompt Studio",
    exact: true,
  });
  const footer = studio.locator(".prompt-studio-footer");
  const actions = footer.getByRole("button");
  await expect(studio).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const bounds = await footer.boundingBox();
    expect(bounds, `${viewport.name}: footer is visible`).not.toBeNull();
    expect(
      bounds!.x,
      `${viewport.name}: footer starts within the viewport`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      bounds!.x + bounds!.width,
      `${viewport.name}: footer ends within the viewport`,
    ).toBeLessThanOrEqual(viewport.width + 1);
    expect(
      await footer.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      `${viewport.name}: footer has no horizontal overflow`,
    ).toBe(true);
    for (const action of await actions.all()) {
      const box = await action.boundingBox();
      expect(box, `${viewport.name}: action is visible`).not.toBeNull();
      expect(
        box!.x,
        `${viewport.name}: action starts inside the drawer`,
      ).toBeGreaterThanOrEqual(bounds!.x - 1);
      expect(
        box!.x + box!.width,
        `${viewport.name}: action ends inside the drawer`,
      ).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
      expect(
        await action.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ),
        `${viewport.name}: action text fits`,
      ).toBe(true);
    }
  }
});

test("masthead theme button stays reachable across phone, tablet, and desktop widths", async ({
  page,
}) => {
  await page.goto(reader);
  const theme = page.locator(".masthead-theme-toggle");
  const viewports = [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 834, height: 1112 },
    { width: 1194, height: 834 },
    { width: 1280, height: 900 },
    { width: 1440, height: 1000 },
  ];
  const themes = ["light", "dark", "light", "dark", "light", "dark", "light"];
  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize(viewport);
    await expect(theme).toBeVisible();
    const bounds = await theme.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await theme.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", themes[index]);
    await expect(theme).toHaveAttribute("aria-label", new RegExp(themes[index]));
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

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "laptop", width: 1366, height: 768 },
]) {
  for (const focus of [0, 1]) {
    test(`${viewport.name}: toolbar scrolls away with Focus ${focus ? "on" : "off"}`, async ({
      page,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.goto(`${reader}?focus=${focus}`);
      const toolbar = page.locator("#reader-toolbar");
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveCSS("position", "relative");
      expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(72);
      // Exercise actual document scrolling rather than just the CSS declaration.
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect
        .poll(() =>
          toolbar.evaluate((node) => node.getBoundingClientRect().bottom),
        )
        .toBeLessThanOrEqual(0);
      await noOverflow(page);
      await page.screenshot({
        path: `test-results/${info.project.name}-${viewport.name}-scrolled-focus${focus}.png`,
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect
        .poll(() =>
          toolbar.evaluate((node) => node.getBoundingClientRect().top),
        )
        .toBeGreaterThanOrEqual(0);
      await page
        .getByRole("button", {
          name: focus ? "Exit Focus" : "Focus",
          exact: true,
        })
        .click();
      await expect(page.locator(".reader")).toHaveClass(
        focus ? /reader(?!.*is-focus)/ : /is-focus/,
      );
    });
  }
}
