import { expect, test } from "@playwright/test";
// The production accessibility audit owns the worst-case image and grain model.
// @ts-expect-error The audit module is JavaScript without type declarations.
import { checkRenderedContrast } from "../../scripts/check-rendered-contrast.mjs";

test("reader toolbar preserves contrast in light and dark responsive states", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1280, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((value) => {
        localStorage.clear();
        localStorage.setItem("portrait-edit-theme", value);
      }, theme);
      await page.goto("issues/the-prompt-issue/pages/60");
      const toolbar = page.locator("#reader-toolbar");
      await expect(toolbar).toBeVisible();
      if (width === 1440) {
        await expect(toolbar).not.toHaveClass(/reader-toolbar-compact/);
      } else {
        await expect(toolbar).toHaveClass(/reader-toolbar-compact/);
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const focus of [false, true]) {
        if (focus) {
          await page.goto("issues/the-prompt-issue/pages/60?focus=1");
          await expect(toolbar).toBeVisible();
        }
        const style = await toolbar.evaluate((node) => ({
          muted: getComputedStyle(node).getPropertyValue("--muted").trim(),
          background: getComputedStyle(node).backgroundColor,
        }));
        expect(style.muted).toBe(theme === "light" ? "#54524e" : "#aaa7a2");
        expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
        const checks = await checkRenderedContrast(page, []);
        if (width === 1440) {
          await expect(toolbar.locator(".focus-button")).toHaveAttribute(
            "aria-pressed",
            String(focus),
          );
        }
        const muted = checks.find(
          (check: { selector: string; token: string }) =>
            check.selector === "#reader-toolbar" && check.token === "--muted",
        );
        expect(muted).toBeTruthy();
        expect(muted.ratio).toBeGreaterThanOrEqual(4.7);
        const button = toolbar.getByRole("button").first();
        await button.focus();
        await expect(button).toBeFocused();
        expect(
          await button.evaluate((el) => getComputedStyle(el).outlineStyle),
        ).not.toBe("none");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
      }
    }
  }
});
