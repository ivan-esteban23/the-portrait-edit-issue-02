import { test, expect } from "@playwright/test";

const widths = [320, 390, 768, 834, 1280, 1440];
for (const theme of ["light", "dark"] as const) {
  test(`Phase 1 source labels and reading typography: ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("portrait-edit-theme", value),
      theme,
    );
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("./");
      await page.locator(".hero-copy").waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const selector of [
        ".issue-stats",
        ".hero-image-caption",
        ".study-card > .eyebrow",
      ]) {
        await expect(page.locator(selector).first()).toHaveCSS(
          "font-size",
          "12px",
        );
      }
      await page.goto("prompts");
      await page.locator(".archive-grid .study-card").first().waitFor();
      await expect(page.locator(".archive-grid .tag-badge").first()).toHaveCSS(
        "font-size",
        "12px",
      );
      expect(
        await page
          .getByRole("searchbox")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      await page.goto("prompts/issue-02-study-001");
      await page.locator(".study-article figcaption").waitFor();
      await expect(page.locator(".study-article figcaption")).toHaveCSS(
        "font-size",
        "12px",
      );
      await expect(page.locator(".study-article")).toHaveCSS("row-gap", "32px");
      await page.goto("issues/the-prompt-issue/pages/14");
      await page.getByRole("button", { name: "Display", exact: true }).click();
      await page.getByLabel("Reading mode").selectOption("text");
      await page
        .getByRole("button", { name: "Close display settings" })
        .click();
      for (const selector of [
        ".chapter-opener-kicker",
        ".chapter-opener-meta",
        ".chapter-opener figcaption",
      ]) {
        await expect(page.locator(selector).first()).toHaveCSS(
          "font-size",
          "12px",
        );
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      // A long source filename must wrap, rather than disappear behind clipping.
      await page
        .locator(".chapter-opener figcaption")
        .first()
        .evaluate((el) => {
          el.textContent = "Reference_filename_".repeat(12) + ".jpg";
        });
      const caption = page.locator(".chapter-opener figcaption").first();
      expect(
        await caption.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
  });
}

test("secondary text scales with root text size while reader sizes stay user selected", async ({
  page,
}) => {
  await page.goto("issues/the-prompt-issue/pages/60");
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page.getByLabel("Reading mode").selectOption("text");
  for (const size of [16, 18, 20]) {
    await page.getByRole("button", { name: `${size} px`, exact: true }).click();
    await expect(page.locator(".reader .study-article")).toHaveCSS(
      "font-size",
      `${size}px`,
    );
  }
  await page.getByRole("button", { name: "Close display settings" }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.locator(".study-article figcaption")).toHaveCSS(
    "font-size",
    "24px",
  );
  await expect(page.locator(".reader .study-article")).toHaveCSS(
    "font-size",
    "20px",
  );
});

test("clipboard fallback fields keep readable form text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Clipboard unavailable");
        },
      },
    });
    document.execCommand = () => false;
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Copy prompt for Study 26", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Prompt to copy for Study 26" }),
  ).toHaveCSS("font-size", "16px");
  await page.goto("prompts/issue-02-study-001");
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Link to copy" })).toHaveCSS(
    "font-size",
    "16px",
  );
});
