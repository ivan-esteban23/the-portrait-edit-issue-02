import { test, expect } from "@playwright/test";

// One project owns this explicit theme/viewport matrix; OS color preference does
// not select the publication theme, which is persisted independently.
for (const theme of ["light", "dark"] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 320, height: 568 },
  ]) {
    test(`editorial layouts: ${theme} at ${viewport.width}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop-light",
        "Explicit matrix runs once",
      );
      await page.setViewportSize(viewport);
      await page.addInitScript((value) => {
        localStorage.setItem("portrait-edit-theme", value);
      }, theme);
      for (const [name, path, selector] of [
        ["home", "./", ".home-hero"],
        ["archive", "prompts", ".archive"],
        ["overview", "issues/the-prompt-issue", ".overview"],
        ["study", "prompts/issue-02-study-001", ".standalone-study"],
        ["about", "about", ".about"],
        ["reader", "issues/the-prompt-issue/pages/15", ".reader-canvas"],
      ]) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator(selector)).toBeVisible();
        await expect(page.locator(".masthead .wordmark-issue")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".route-loading")).toHaveCount(0);
        await expect
          .poll(() =>
            page
              .locator(selector)
              .locator("img")
              .evaluateAll((images) =>
                images
                  .filter((image) => {
                    const rect = image.getBoundingClientRect();
                    return (
                      rect.width > 0 &&
                      rect.height > 0 &&
                      rect.top < innerHeight &&
                      rect.bottom > 0
                    );
                  })
                  .every(
                    (image) =>
                      image instanceof HTMLImageElement &&
                      image.complete &&
                      image.naturalWidth > 0,
                  ),
              ),
          )
          .toBe(true);
        const navigation = page.getByRole("navigation", {
          name: "Publication",
          exact: true,
        });
        expect(
          await navigation
            .locator("a")
            .evaluateAll((links) =>
              links.every((link) => link.scrollWidth <= link.clientWidth),
            ),
        ).toBe(true);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width + 1);
        if (name === "home") {
          for (const label of ["Start reading ↗", "Browse studies"]) {
            const link = page.getByRole("link", { name: label, exact: true });
            await expect(link).toBeVisible();
            const box = (await link.boundingBox())!;
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          }
          const arrow = page
            .getByRole("link", { name: "Start reading ↗", exact: true })
            .locator(".text-icon svg");
          await expect(arrow).toBeVisible();
          await expect(arrow).toHaveAttribute("aria-hidden", "true");
          const caption = page.locator(".hero-image-caption");
          await expect(caption).toBeVisible();
          await expect(page.locator(".hero-cover > span")).toBeVisible();
          const bounds = await caption.boundingBox();
          const imageBounds = (await page
            .locator(".hero-portrait > img")
            .boundingBox())!;
          expect(Math.abs(bounds!.x - imageBounds.x)).toBeLessThanOrEqual(1);
          expect(
            Math.abs(bounds!.width - imageBounds.width),
          ).toBeLessThanOrEqual(1);
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
        }
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${theme}-${viewport.width}.png`),
        });
        if (name === "home") {
          const selected = page.locator(".selected-section");
          for (const image of await selected
            .locator(".study-card-media img")
            .all()) {
            await image.scrollIntoViewIfNeeded();
            await expect(image).toBeVisible();
            await expect
              .poll(() =>
                image.evaluate(
                  (img: HTMLImageElement) =>
                    img.complete && img.naturalWidth > 0,
                ),
              )
              .toBe(true);
          }
          await selected.screenshot({
            path: testInfo.outputPath(
              `featured-${theme}-${viewport.width}.png`,
            ),
          });
        }
      }
      // Radix portals sit outside .publication; arrow sizing must work there too.
      await page.getByRole("button", { name: "Display", exact: true }).click();
      const display = page.getByRole("dialog", {
        name: "Display & navigation",
      });
      await expect(display).toBeVisible();
      const displayArrows = display.locator(".text-icon svg:visible");
      await expect(displayArrows.first()).toBeVisible();
      for (const arrow of await displayArrows.all()) {
        const box = await arrow.boundingBox();
        expect(box!.width).toBeGreaterThan(8);
        expect(box!.width).toBeLessThanOrEqual(32);
      }
      await page.screenshot({
        path: testInfo.outputPath(`display-${theme}-${viewport.width}.png`),
      });
      await page
        .getByRole("button", { name: "Close display settings" })
        .click();
      await page.keyboard.press("?");
      const shortcuts = page.getByRole("dialog", {
        name: "Keyboard Shortcuts",
        exact: true,
      });
      await expect(shortcuts).toBeVisible();
      await expect(shortcuts.locator(".text-icon svg")).toHaveCount(2);
      for (const arrow of await shortcuts.locator(".text-icon svg").all()) {
        const box = await arrow.boundingBox();
        expect(box!.width).toBeGreaterThan(8);
        expect(box!.width).toBeLessThanOrEqual(32);
      }
      await page.screenshot({
        path: testInfo.outputPath(`shortcuts-${theme}-${viewport.width}.png`),
      });
    });
  }
}

test("touch-enabled tablet contexts keep discovery visible at 320×568", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "Explicit touch matrix runs once",
  );
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: { width: 320, height: 568 },
      hasTouch: true,
    });
    try {
      await context.addInitScript(
        (theme) => localStorage.setItem("portrait-edit-theme", theme),
        theme,
      );
      const page = await context.newPage();
      await page.goto("./");
      await page.evaluate(() => document.fonts.ready);
      for (const name of ["Start reading ↗", "Browse studies"]) {
        const link = page.getByRole("link", { name, exact: true });
        await expect(link).toBeVisible();
        const box = (await link.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(568);
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
      await page.screenshot({
        path: testInfo.outputPath(`home-touch-${theme}-320.png`),
      });
      await page.goto("prompts");
      const firstCard = page.locator(".archive-grid .study-card").first();
      await expect(firstCard).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect((await firstCard.boundingBox())!.y).toBeLessThan(568);
      await page.screenshot({
        path: testInfo.outputPath(`archive-touch-${theme}-320.png`),
      });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("issues/the-prompt-issue/pages/60");
      const toolbar = page.locator("#reader-toolbar");
      await expect(toolbar).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(64);
      await expect(
        page.getByRole("button", { name: "Copy page link", exact: true }),
      ).toBeVisible();
      for (const control of await toolbar
        .locator("button, input, select")
        .all()) {
        if (!(await control.isVisible())) continue;
        const box = (await control.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
      await page.screenshot({
        path: testInfo.outputPath(`reader-touch-${theme}-1920.png`),
      });
    } finally {
      await context.close();
    }
  }
});
