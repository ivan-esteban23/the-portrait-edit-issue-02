import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`desktop Focus toolbar keeps text contrast while idle in ${theme} mode`, async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width <= 1100, "Desktop idle behavior");
    await page.addInitScript(
      (theme) => localStorage.setItem("portrait-edit-theme", theme),
      theme,
    );
    await page.goto("issues/the-prompt-issue/pages/60?focus=1");
    await page.locator(".reader-canvas").focus();
    await page.mouse.move(900, 600);
    await expect(page.locator(".reader")).toHaveClass(/chrome-idle/, {
      timeout: 6000,
    });
    const results = await new AxeBuilder({ page })
      .setLegacyMode(true)
      .withRules(["color-contrast", "image-alt"])
      .analyze();
    expect(results.violations).toEqual([]);
    await expect(page.locator(".reader")).toHaveClass(/chrome-idle/);
    await page.keyboard.press("Tab");
    await expect(page.locator(".reader")).not.toHaveClass(/chrome-idle/);
  });
}
