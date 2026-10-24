import { expect, test, type Page } from "@playwright/test";

const viewports = [
  360, 375, 393, 412, 430, 440, 768, 800, 834, 924, 1024, 1180, 1280, 1366,
  1470, 1512, 1536, 1710, 1728, 1920, 2560, 3440, 3840, 5120, 6016, 7680,
].map((width) => ({
  width,
  height:
    width >= 7680
      ? 4320
      : width >= 6016
        ? 3384
        : width >= 5120
          ? 2880
          : width >= 3840
            ? 2160
            : width >= 2560
              ? 1440
              : width >= 1920
                ? 1080
                : width <= 440
                  ? 900
                  : width <= 1024
                    ? 1100
                    : 1000,
}));

test.describe.configure({ timeout: 120_000 });

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

async function checkTouchTargets(page: Page, selector: string) {
  if (!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches))) {
    return;
  }
  const controls = page.locator(selector);
  expect(await controls.count()).toBeGreaterThan(0);
  const undersized = await controls.evaluateAll((controls) =>
    controls
      .filter((control) => {
        const style = getComputedStyle(control);
        return (
          control.getClientRects().length > 0 && style.visibility !== "hidden"
        );
      })
      .map((control) => {
        const rect = control.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label: control.getAttribute("aria-label"),
        };
      })
      .filter(
        ({ width, height }) =>
          Math.round(width * 100) / 100 < 48 ||
          Math.round(height * 100) / 100 < 48,
      ),
  );
  expect(undersized).toEqual([]);
}

test("all requested CSS viewport widths keep the archive inside the screen", async ({
  page,
}) => {
  await page.goto("prompts");
  await expect(
    page.getByRole("heading", { name: "Portrait prompts", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".archive-grid .study-card").first()).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await checkTouchTargets(page, ".archive-grid .card-actions button");
  }
});

test("all requested CSS viewport widths keep the reader usable and centered", async ({
  page,
}) => {
  await page.goto("issues/the-prompt-issue/pages/60");
  await expect(page.locator("#reader-toolbar")).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    const publicationWidth = await page
      .locator(".publication")
      .evaluate((element) => element.getBoundingClientRect().width);
    if (viewport.width >= 1920) {
      expect(publicationWidth).toBeLessThanOrEqual(1441);
    }
    await checkTouchTargets(
      page,
      "#reader-toolbar :is(button, input, select), .reader-bottom :is(button, input, select)",
    );
  }
});

// Width and height are CSS viewport pixels. Keep high-resolution cases sequential.
const archiveViewports = [
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [720, 1280],
  [768, 1024],
  [834, 1112],
  [1024, 768],
  [1280, 800],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
  [5120, 2880],
  [6016, 3384],
  [7680, 4320],
].map(([width, height]) => ({ width, height }));

async function archiveMetrics(page: Page) {
  return page.evaluate(() => {
    const firstCard = document
      .querySelector(".archive-grid .study-card")!
      .getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      documentWidth: document.documentElement.scrollWidth,
      publicationWidth: document
        .querySelector(".publication")!
        .getBoundingClientRect().width,
      firstCardY: firstCard.top,
      firstCardWidth: firstCard.width,
      resultsY: document
        .querySelector(".results-count")!
        .getBoundingClientRect().top,
    };
  });
}

test("archive entry stays compact from small phones through 8K CSS viewports", async ({
  page,
}, info) => {
  await page.goto("prompts");
  await expect(page.locator(".archive-grid .study-card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const measurements = [];
  for (const viewport of archiveViewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await archiveMetrics(page);
    measurements.push(metrics);
    expect(metrics.width).toBe(viewport.width);
    expect(metrics.height).toBe(viewport.height);
    expect(metrics.dpr).toBe(1);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.publicationWidth).toBeLessThanOrEqual(1440);
    if (viewport.height >= 568) {
      expect(
        metrics.firstCardY,
        `${viewport.width}×${viewport.height}: portraits start in the first screen`,
      ).toBeLessThan(viewport.height);
      expect(metrics.resultsY).toBeLessThan(metrics.firstCardY);
    }
    if (viewport.width >= 1920)
      expect(metrics.firstCardWidth).toBeLessThanOrEqual(450);
    const filters = page.getByText(/^More filters/);
    const tools = page.getByText("Archive tools", { exact: true });
    await expect(
      page.getByRole("combobox", { name: "Model", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Select Prompts", exact: true }),
    ).toBeHidden();
    await filters.click();
    await expect(
      page.getByRole("combobox", { name: "Model", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await filters.click();
    await tools.click();
    await expect(
      page.getByRole("button", { name: "Select Prompts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Moodboard collection", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await tools.click();
  }
  await info.attach("archive-css-viewport-measurements", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
});

test("archive entry also fits representative DPR 2 phone, tablet, and laptop viewports", async ({
  browser,
  baseURL,
}, info) => {
  const context = await browser.newContext({
    baseURL,
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("prompts");
    await expect(
      page.locator(".archive-grid .study-card").first(),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const measurements = [];
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 834, height: 1112 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const metrics = await archiveMetrics(page);
      measurements.push(metrics);
      expect(metrics).toMatchObject({ ...viewport, dpr: 2 });
      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width);
      expect(metrics.firstCardY).toBeLessThan(viewport.height);
    }
    await info.attach("archive-dpr-2-measurements", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
  } finally {
    await context.close();
  }
});

test("archive disclosures work by keyboard and keep URL filters visible when closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("prompts?q=Frost&model=Unspecified&ar=none");
  const filters = page.locator("summary").filter({ hasText: "More filters" });
  await filters.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", { name: "Style / tag" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Style / tag" })
    .selectOption("regal");
  await expect(page).toHaveURL(/tag=regal/);
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(1);
  await filters.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("combobox", { name: "Style / tag" }),
  ).toBeHidden();
  const active = page.getByRole("list", { name: "Active filters" });
  await expect(active).toContainText("Style: #regal");
  await expect(active).toContainText("Model: Unspecified");
  await expect(active).toContainText("Aspect ratio: Not recorded");
  await page.keyboard.press("Tab");
  const tools = page.getByText("Archive tools", { exact: true });
  await expect(tools).toBeFocused();
  expect(
    await tools.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const select = page.getByRole("button", {
    name: "Select Prompts",
    exact: true,
  });
  await expect(select).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Cancel Selection", exact: true }),
  ).toBeVisible();
  const reset = page.getByRole("button", {
    name: "Reset all filters",
    exact: true,
  });
  await expect(reset).toHaveText("Reset all");
  await reset.click();
  await expect(page).toHaveURL(/\/prompts$/);
  await expect(active).toBeHidden();
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(165);
});
