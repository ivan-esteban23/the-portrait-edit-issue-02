import { expect, test } from "@playwright/test";

test("Studio keeps a usable scroll area and stable feedback in short landscape", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("unavailable");
        },
      },
    });
    document.execCommand = () => false;
  });
  for (const width of [568, 740, 844]) {
    await page.setViewportSize({ width, height: 320 });
    await page.goto("prompts/issue-02-study-001");
    await page.getByRole("button", { name: "Customize prompt" }).click();
    const dialog = page.getByRole("dialog");
    const body = dialog.locator(".prompt-studio-body");
    const status = dialog.getByRole("status", { name: "Copy feedback" });
    const copy = dialog.getByRole("button", { name: "Copy Modified Prompt" });
    const before = await copy.boundingBox();
    expect((await body.boundingBox())!.height).toBeGreaterThanOrEqual(140);
    for (const button of await dialog
      .locator(".prompt-studio-footer button")
      .all()) {
      const rect = (await button.boundingBox())!;
      expect(rect.height).toBeGreaterThanOrEqual(48);
      expect(rect.width).toBeGreaterThanOrEqual(48);
      expect(rect.y + rect.height).toBeLessThanOrEqual(320);
    }
    await copy.click();
    await expect(status).toHaveText(
      "Copy unavailable. Select the preview text to copy it.",
    );
    await expect(copy).toBeFocused();
    expect((await copy.boundingBox())!.y).toBe(before!.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
  }
});
