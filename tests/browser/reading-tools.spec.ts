import { test, expect, type Locator } from "@playwright/test";
const reader = "issues/the-prompt-issue/pages/60";

test("reader bookmarks synchronize and progress resumes in a fresh session", async ({
  page,
  browser,
}) => {
  await page.goto(reader);
  const bookmark = page.locator(".reader-bookmark-btn");
  await expect(bookmark).toHaveAttribute("aria-pressed", "false");
  await bookmark.click();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".reader-announcer")).toContainText(
    "saved to bookmarks",
  );
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("b");
  await expect(bookmark).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("B");
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Page number", { exact: true }).focus();
  await page.keyboard.press("b");
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/pages\/61$/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("portrait-edit-last-read") || "{}")[
            "the-prompt-issue"
          ],
      ),
    )
    .toBe(61);
  const homeUrl = page.url().split("/issues/")[0] + "/";
  await page.goto(homeUrl);
  await expect(
    page.getByRole("link", { name: "Resume reading · Page 61 ↗", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read The Prompt Issue", exact: true }),
  ).toHaveAttribute("href", /pages\/61$/);
  await page
    .getByRole("link", { name: "Inside the issue", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Resume reading (Page 61) ↗", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start from beginning", exact: true }),
  ).toBeVisible();
  const context = await browser.newContext({
    storageState: await page.context().storageState(),
    viewport: page.viewportSize(),
  });
  try {
    const fresh = await context.newPage();
    await fresh.goto(homeUrl);
    await fresh
      .getByRole("link", { name: "Resume reading · Page 61 ↗", exact: true })
      .click();
    await expect(fresh).toHaveURL(/pages\/61$/);
    await expect(fresh.getByLabel("Page number", { exact: true })).toHaveValue(
      "61",
    );
  } finally {
    await context.close();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

async function touch(
  viewport: Locator,
  type: string,
  points: { x: number; y: number }[],
  changed = points,
) {
  await viewport.evaluate(
    (node, args) => {
      const make = (points: { x: number; y: number }[]) =>
        points.map(
          (p, identifier) =>
            new Touch({ identifier, target: node, clientX: p.x, clientY: p.y }),
        );
      node.dispatchEvent(
        new TouchEvent(args.type, {
          bubbles: true,
          cancelable: true,
          touches: make(args.points),
          changedTouches: make(args.changed),
        }),
      );
    },
    { type, points, changed },
  );
}
test("lightbox touch gestures anchor, clamp, cancel safely, and dismiss with focus restored", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("prompts/issue-02-study-005");
  const opener = page.getByRole("button", {
    name: "Inspect high-resolution reference for Frost Fantasy Portrait",
  });
  await opener.click();
  const viewport = page.locator(".lightbox-viewport");
  const image = page.locator(".lightbox-image");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const box = (await viewport.boundingBox())!;
  const point = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.4 };
  for (let i = 0; i < 2; i++) {
    await touch(viewport, "touchstart", [point]);
    await touch(viewport, "touchend", [], [point]);
  }
  const expected = { x: box.width * 0.15 * 1.5, y: box.height * 0.1 * 1.5 };
  const translation = () =>
    image.evaluate((node) => {
      const matrix = new DOMMatrix((node as HTMLElement).style.transform);
      return { x: matrix.m41, y: matrix.m42, zoom: matrix.a };
    });
  await expect.poll(async () => (await translation()).zoom).toBe(2.5);
  const first = await translation();
  expect(first.zoom).toBe(2.5);
  expect(first.x).toBeCloseTo(expected.x, 1);
  expect(first.y).toBeCloseTo(expected.y, 1);
  await expect(page.locator(".lightbox-zoom-level")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await expect(viewport).toHaveCSS("touch-action", "none");
  await page.getByRole("button", { name: "Reset zoom", exact: true }).click();
  const a = { x: box.x + box.width * 0.4, y: box.y + box.height / 2 };
  const b = { x: box.x + box.width * 0.6, y: a.y };
  await touch(viewport, "touchstart", [a, b]);
  await touch(viewport, "touchmove", [
    { x: a.x - box.width * 0.1, y: a.y },
    { x: b.x + box.width * 0.1, y: b.y },
  ]);
  await expect.poll(async () => (await translation()).zoom).toBeCloseTo(2, 3);
  await touch(viewport, "touchend", [a], [b]);
  await touch(viewport, "touchmove", [{ x: a.x + 5000, y: a.y + 5000 }]);
  await expect
    .poll(async () => (await translation()).x)
    .toBeCloseTo(box.width / 2, 1);
  await expect
    .poll(async () => (await translation()).y)
    .toBeCloseTo(box.height / 2, 1);
  const clamped = await translation();
  expect(clamped.x).toBeCloseTo(box.width / 2, 1);
  expect(clamped.y).toBeCloseTo(box.height / 2, 1);
  await touch(viewport, "touchend", [], [a]);
  await page.getByRole("button", { name: "Reset zoom", exact: true }).click();
  await touch(viewport, "touchstart", [a]);
  await touch(viewport, "touchmove", [{ x: a.x, y: a.y + 100 }]);
  await touch(viewport, "touchcancel", [], [a]);
  await expect(page.getByRole("dialog")).toBeVisible();
  await touch(viewport, "touchstart", [a]);
  await touch(viewport, "touchmove", [{ x: a.x, y: a.y + 100 }]);
  await touch(viewport, "touchend", [], [{ x: a.x, y: a.y + 100 }]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
});

test("reader slideshow toggle and keyboard shortcut p control presentation playback", async ({
  page,
}) => {
  await page.goto(reader);
  const slideshowBtn = page.getByRole("button", {
    name: "Toggle presentation slideshow",
    exact: true,
  });
  await expect(slideshowBtn).toBeVisible();
  await expect(slideshowBtn).toHaveAttribute("aria-pressed", "false");

  // Press 'p' to start slideshow
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("p");
  await expect(slideshowBtn).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".reader-slideshow-progress")).toBeVisible();

  // Press 'p' again to pause
  await page.keyboard.press("p");
  await expect(slideshowBtn).toHaveAttribute("aria-pressed", "false");
});

test("Archive multi-select mode and floating batch actions toolbar", async ({
  page,
}) => {
  await page.goto("prompts?q=Frost%20Fantasy%20Portrait");
  const selectModeBtn = page.getByRole("button", {
    name: "Select Prompts",
    exact: true,
  });
  await expect(selectModeBtn).toBeVisible();
  await selectModeBtn.click();
  await expect(
    page.getByRole("button", { name: "Cancel Selection", exact: true }),
  ).toBeVisible();

  // Select all filtered
  await page
    .getByRole("button", { name: "Select All Filtered", exact: true })
    .click();

  // Floating batch toolbar should appear
  const toolbar = page.locator(".batch-floating-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toContainText("1 prompt selected");

  // Clear selection
  await toolbar.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(toolbar).toBeHidden();
});

