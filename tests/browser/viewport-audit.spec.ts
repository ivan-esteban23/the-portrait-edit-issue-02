import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

// Keep DOM traces and failure screenshots without recording large filmstrip
// frames for every action in the high-resolution viewport cases.
test.use({ trace: { mode: "retain-on-failure", screenshots: false } });

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
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Select Prompts", exact: true }),
    ).toBeHidden();
    await filters.click();
    await expect(
      page.getByRole("combobox", { name: "Style / tag" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Model and aspect ratio metadata is not yet recorded/),
    ).toBeVisible();
    const styleWidth = await page
      .getByRole("combobox", { name: "Style / tag" })
      .evaluate((node) => node.getBoundingClientRect().width);
    expect(styleWidth).toBeGreaterThanOrEqual(220);
    if (viewport.width >= 2560) expect(styleWidth).toBeLessThanOrEqual(280);
    measurements[measurements.length - 1] = { ...metrics, styleWidth };
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
      expect(metrics).toMatchObject({ ...viewport, dpr: 2 });
      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width);
      expect(metrics.firstCardY).toBeLessThan(viewport.height);
      const filters = page.getByText(/^More filters/);
      await filters.click();
      const style = page.getByRole("combobox", { name: "Style / tag" });
      await expect(style).toBeVisible();
      const styleWidth = await style.evaluate(
        (node) => node.getBoundingClientRect().width,
      );
      expect(styleWidth).toBeGreaterThanOrEqual(220);
      await noOverflow(page);
      measurements.push({ ...metrics, styleWidth });
      await filters.click();
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
  await expect(page.getByRole("combobox", { name: "Model" })).toHaveCount(0);
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

// Compare the exposed filters with the source inventory, including uncommon tags.
// These cases run serially because the matrix includes very large CSS viewports.
test.describe("archive tag discovery", () => {
  test.describe.configure({ mode: "serial" });

  for (const viewport of archiveViewports) {
    test(`${viewport.width}×${viewport.height}: every tag is discoverable and keyboard reachable`, async ({
      page,
    }, info) => {
      await auditArchiveTags(page, viewport, 1, info);
    });
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 834, height: 1112 },
    { width: 1920, height: 1080 },
  ]) {
    test(`DPR 2 at ${viewport.width}×${viewport.height}: tag discovery and keyboard access`, async ({
      browser,
      baseURL,
    }, info) => {
      const context = await browser.newContext({
        baseURL,
        viewport,
        deviceScaleFactor: 2,
        hasTouch: true,
      });
      try {
        await auditArchiveTags(await context.newPage(), viewport, 2, info);
      } finally {
        await context.close();
      }
    });
  }

  test("a deep-linked uncommon tag stays visible and Clear tag preserves other URL filters", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "prompts?q=Portrait&model=Unspecified&tag=victorian-inspired",
    );
    const region = page.getByRole("region", { name: "Tag filters" });
    const selected = region.getByRole("button", {
      name: /^#victorian-inspired \(/,
    });
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toBeVisible();
    await selected.focus();
    await page.keyboard.press("Space");
    const more = region.getByRole("button", { name: /^More tags/ });
    await expect(more).toBeFocused();
    await expect(page).toHaveURL(/q=Portrait&model=Unspecified$/);
    await page.goto(
      "prompts?q=Portrait&model=Unspecified&tag=victorian-inspired",
    );
    await more.focus();
    await page.keyboard.press("Tab");
    await expect(
      region.getByRole("button", { name: "Clear tag", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(more).toBeFocused();
    await expect(page).toHaveURL(/q=Portrait&model=Unspecified$/);
    await expect(
      page.getByRole("searchbox", { name: "Search", exact: true }),
    ).toHaveValue("Portrait");
  });
});

const sourceTags = new Map<string, number>();
const promptDirectory = new URL("../../src/content/prompts/", import.meta.url);
for (const file of readdirSync(promptDirectory).filter((file) =>
  file.endsWith(".json"),
)) {
  const prompt = JSON.parse(
    readFileSync(new URL(file, promptDirectory), "utf8"),
  );
  for (const tag of prompt.tags as string[])
    sourceTags.set(tag, (sourceTags.get(tag) ?? 0) + 1);
}
const orderedTags = [...sourceTags].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
);

async function auditArchiveTags(
  page: Page,
  viewport: { width: number; height: number },
  dpr: number,
  info: TestInfo,
) {
  await page.setViewportSize(viewport);
  await page.goto("prompts");
  await page.evaluate(() => document.fonts.ready);
  const region = page.getByRole("region", { name: "Tag filters" });
  const popularCount =
    viewport.width >= 1024
      ? 6
      : viewport.width >= 768
        ? 3
        : viewport.width >= 390
          ? 2
          : 1;
  const more = region.getByRole("button", {
    name: /^(More tags \(\d+\)|Fewer tags)$/,
  });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toHaveText(
    `More tags (${sourceTags.size - popularCount})`,
  );
  await expect(region.getByRole("button", { name: /^#/ })).toHaveCount(
    popularCount,
  );
  const extra = page.locator(`#${await more.getAttribute("aria-controls")}`);
  await expect(extra).toBeHidden();
  const collapsed = await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const region = document.querySelector(".archive-tag-pills")!;
    const bounds = region.getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      documentWidth: document.documentElement.scrollWidth,
      publicationWidth: document
        .querySelector(".publication")!
        .getBoundingClientRect().width,
      tagRegionWidth: bounds.width,
      tagRegionScrollWidth: region.scrollWidth,
      tagRegionX: bounds.left,
      searchX: document
        .querySelector<HTMLInputElement>('input[type="search"]')!
        .getBoundingClientRect().left,
      firstCardY: document
        .querySelector(".archive-grid .study-card")!
        .getBoundingClientRect().top,
    };
  });
  expect(collapsed).toMatchObject({ ...viewport, dpr });
  expect(collapsed.documentWidth).toBeLessThanOrEqual(viewport.width);
  expect(collapsed.publicationWidth).toBeLessThanOrEqual(1440);
  expect(collapsed.tagRegionWidth).toBeLessThanOrEqual(1152);
  expect(collapsed.tagRegionScrollWidth).toBeLessThanOrEqual(
    Math.ceil(collapsed.tagRegionWidth),
  );
  expect(Math.abs(collapsed.tagRegionX - collapsed.searchX)).toBeLessThan(1);
  if (viewport.height >= 568)
    expect(collapsed.firstCardY).toBeLessThan(viewport.height);
  const moreBounds = (await more.boundingBox())!;
  expect(moreBounds.x).toBeGreaterThanOrEqual(0);
  expect(moreBounds.x + moreBounds.width).toBeLessThanOrEqual(viewport.width);

  const compact = (await more.getAttribute("aria-haspopup")) === "dialog";
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(extra).toBeVisible();
  if (compact) {
    await auditPhoneTagPicker(page, viewport);
    await info.attach("tag-filter-viewport-measurements", {
      body: JSON.stringify(
        {
          ...collapsed,
          popularCount,
          totalTags: sourceTags.size,
          keyboardTagsChecked: orderedTags.length,
          picker: "dialog",
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    return;
  }
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(region.getByRole("button", { name: /^#/ })).toHaveCount(
    sourceTags.size,
  );
  const first = region.getByRole("button", {
    name: `#${orderedTags[0][0]} (${orderedTags[0][1]})`,
    exact: true,
  });
  await first.focus();
  // Traverse every tag with native Tab, including tags below the viewport.
  for (const [index, [name, count]] of orderedTags.entries()) {
    if (index > 0) await page.keyboard.press("Tab");
    if (index === popularCount) {
      await expect(more).toBeFocused();
      await page.keyboard.press("Tab");
    }
    // Inspect the element native Tab actually focused, without repeatedly
    // rebuilding the accessibility tree for the entire archive.
    const metrics = await focusedTagMetrics(page);
    expect(metrics.label).toBe(`#${name} (${count})`);
    expect(metrics.nodeName).toBe("BUTTON");
    expect(metrics.pressed).toBe("false");
    expect(metrics.inTagRegion).toBe(true);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(viewport.width);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.bottom).toBeLessThanOrEqual(viewport.height);
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    if (index > 0) expect(metrics.outline).not.toBe("none");
  }
  await noOverflow(page);
  const last = orderedTags.at(-1)!;
  const lastTag = region.getByRole("button", {
    name: `#${last[0]} (${last[1]})`,
    exact: true,
  });
  await page.keyboard.press("Space");
  await expect(lastTag).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.get("tag")).toBe(last[0]);
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(last[1]);
  await expect(lastTag).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(lastTag).toHaveAttribute("aria-pressed", "false");
  expect(new URL(page.url()).searchParams.has("tag")).toBe(false);
  await more.focus();
  await page.keyboard.press("Space");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();
  await expect(extra).toBeHidden();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => document.activeElement?.closest("#archive-extra-tags") === null,
    ),
  ).toBe(true);
  await info.attach("tag-filter-viewport-measurements", {
    body: JSON.stringify(
      {
        ...collapsed,
        popularCount,
        totalTags: sourceTags.size,
        keyboardTagsChecked: orderedTags.length,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

async function auditPhoneTagPicker(
  page: Page,
  viewport: { width: number; height: number },
) {
  const dialog = page.getByRole("dialog", { name: "Browse tags" });
  const search = dialog.getByRole("searchbox", { name: "Find a tag" });
  await expect(search).toBeFocused();
  const all = dialog.getByRole("group", { name: "All tags" });
  await expect(all.getByRole("button")).toHaveCount(sourceTags.size);
  const bounds = (await dialog.boundingBox())!;
  const listBounds = (await all.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  await all.getByRole("button").first().focus();
  for (const [index, [name, count]] of orderedTags.entries()) {
    if (index) await page.keyboard.press("Tab");
    const metrics = await focusedTagMetrics(page);
    expect(metrics.label).toBe(`#${name} (${count})`);
    expect(metrics.nodeName).toBe("BUTTON");
    expect(metrics.pressed).toBe("false");
    expect(metrics.inTagRegion).toBe(true);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(viewport.width);
    expect(metrics.top).toBeGreaterThanOrEqual(listBounds.y);
    expect(metrics.bottom).toBeLessThanOrEqual(
      listBounds.y + listBounds.height,
    );
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    if (index) expect(metrics.outline).not.toBe("none");
  }
  for (let index = orderedTags.length - 2; index >= 0; index--) {
    await page.keyboard.press("Shift+Tab");
    const metrics = await focusedTagMetrics(page);
    expect(metrics.label).toBe(
      `#${orderedTags[index][0]} (${orderedTags[index][1]})`,
    );
    expect(metrics.top).toBeGreaterThanOrEqual(listBounds.y);
    expect(metrics.bottom).toBeLessThanOrEqual(
      listBounds.y + listBounds.height,
    );
  }
  await search.fill(" #quietly melancholic ");
  await expect(all.getByRole("button")).toHaveCount(1);
  const selected = all.getByRole("button", {
    name: `#quietly melancholic (${sourceTags.get("quietly melancholic")})`,
    exact: true,
  });
  await selected.click();
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await expect(selected).toBeFocused();
  await dialog.getByRole("button", { name: "Done", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close tag picker" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Done", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  const region = page.getByRole("region", { name: "Tag filters" });
  const more = region.getByRole("button", { name: /^More tags/ });
  await expect(more).toBeFocused();
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(
    sourceTags.get("quietly melancholic")!,
  );
  await expect(
    region.getByRole("button", { name: /^#quietly melancholic/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await more.click();
  await expect(search).toHaveValue("");
  await search.fill("not-a-real-tag");
  await expect(dialog.getByText(/No matching tags/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();
  await region.getByRole("button", { name: "Clear tag", exact: true }).click();
  await expect(more).toBeFocused();
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(165);
  await noOverflow(page);
}

async function focusedTagMetrics(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement!;
    const rect = element.getBoundingClientRect();
    const header = document.querySelector(".masthead")!;
    return {
      label: element.textContent?.replace(/\s+/g, " ").trim(),
      nodeName: element.nodeName,
      pressed: element.getAttribute("aria-pressed"),
      inTagRegion: !!element.closest(
        '[aria-label="Tag filters"], [aria-label="All tags"]',
      ),
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      outline: getComputedStyle(element).outlineStyle,
      headerBottom:
        getComputedStyle(header).position === "sticky"
          ? header.getBoundingClientRect().bottom
          : 0,
    };
  });
}

test("reverse keyboard traversal keeps tag focus below the sticky masthead", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("prompts");
  const region = page.getByRole("region", { name: "Tag filters" });
  const more = region.getByRole("button", {
    name: /^(More tags \(\d+\)|Fewer tags)$/,
  });
  await more.focus();
  await page.keyboard.press("Enter");
  const last = orderedTags.at(-1)!;
  await region
    .getByRole("button", { name: `#${last[0]} (${last[1]})`, exact: true })
    .focus();
  for (let index = orderedTags.length - 2; index >= 0; index--) {
    await page.keyboard.press("Shift+Tab");
    if (index === 5) {
      await expect(more).toBeFocused();
      await page.keyboard.press("Shift+Tab");
    }
    const metrics = await focusedTagMetrics(page);
    expect(metrics.label).toBe(
      `#${orderedTags[index][0]} (${orderedTags[index][1]})`,
    );
    expect(metrics.top).toBeGreaterThanOrEqual(metrics.headerBottom + 4);
    expect(metrics.bottom).toBeLessThanOrEqual(720);
  }
});

test("tag labels and counts retain text contrast in both themes and selected states", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("prompts?tag=playful");
  const counts = page.locator(".tag-pills-primary .tag-pill-count");
  await expect(counts).toHaveCount(2);
  const results = [];
  for (const theme of ["dark", "light"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
      await page.getByRole("button", { name: /Color theme:/ }).click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const measurements = await counts.evaluateAll((elements) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const rgba = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].map(
          (channel) => channel / 255,
        );
      };
      const over = (foreground: number[], background: number[]) => [
        ...foreground
          .slice(0, 3)
          .map(
            (channel, index) =>
              channel * foreground[3] + background[index] * (1 - foreground[3]),
          ),
        1,
      ];
      const background = (element: Element) => {
        const ancestors: Element[] = [];
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        )
          ancestors.unshift(node);
        return ancestors.reduce(
          (color, node) =>
            over(rgba(getComputedStyle(node).backgroundColor), color),
          [1, 1, 1, 1],
        );
      };
      const luminance = (color: number[]) =>
        color
          .slice(0, 3)
          .map((channel) =>
            channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4,
          )
          .reduce(
            (sum, channel, index) =>
              sum + channel * [0.2126, 0.7152, 0.0722][index],
            0,
          );
      const contrast = (foreground: number[], background: number[]) =>
        (Math.max(luminance(foreground), luminance(background)) + 0.05) /
        (Math.min(luminance(foreground), luminance(background)) + 0.05);
      return elements.map((element) => {
        const style = getComputedStyle(element);
        const button = element.parentElement!;
        const bg = background(element);
        const countColor = rgba(style.color);
        countColor[3] *= Number(style.opacity);
        return {
          tag: button.textContent?.trim(),
          pressed: button.getAttribute("aria-pressed"),
          countContrast: contrast(over(countColor, bg), bg),
          labelContrast: contrast(
            over(rgba(getComputedStyle(button).color), bg),
            bg,
          ),
        };
      });
    });
    expect(measurements.map(({ pressed }) => pressed)).toEqual([
      "true",
      "false",
    ]);
    for (const measurement of measurements) {
      expect(
        measurement.countContrast,
        `${theme}: ${measurement.tag} count`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        measurement.labelContrast,
        `${theme}: ${measurement.tag} label`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    results.push({ theme, measurements });
  }
  await info.attach("tag-label-count-contrast", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
});
