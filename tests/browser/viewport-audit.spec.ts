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
