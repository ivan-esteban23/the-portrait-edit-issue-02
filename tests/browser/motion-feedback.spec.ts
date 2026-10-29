import { expect, test } from "@playwright/test";

test("thumbnail centering honors live reduced-motion preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    (
      window as unknown as Window & { scrollBehaviors: string[] }
    ).scrollBehaviors = [];
    Element.prototype.scrollIntoView = function (options) {
      if (
        this.parentElement?.classList.contains("filmstrip-scroll") &&
        typeof options === "object"
      ) {
        (
          window as unknown as Window & { scrollBehaviors: string[] }
        ).scrollBehaviors.push(options.behavior ?? "auto");
      }
      return original.call(this, options);
    };
  });
  await page.goto("issues/the-prompt-issue/pages/95");
  await page.getByRole("button", { name: "Toggle page thumbnails" }).click();
  const calls = () =>
    page.evaluate(
      () =>
        (window as unknown as Window & { scrollBehaviors: string[] })
          .scrollBehaviors,
    );
  await expect.poll(calls).toContain("instant");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "Jump to page 96", exact: true })
    .click();
  await expect(page).toHaveURL(/pages\/96/);
  await expect.poll(calls).toContain("smooth");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Jump to page 97", exact: true })
    .click();
  await expect(page).toHaveURL(/pages\/97/);
  await expect.poll(async () => (await calls()).at(-1)).toBe("instant");
});

test("prompt copy feedback keeps its allocated space and focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.goto("prompts/issue-02-study-001");
  const feedback = page.locator(".prompt-card .copy-feedback");
  const button = page.locator(".prompt-copy-actions button").first();
  await expect(button).toHaveText("Copy prompt");
  await button.scrollIntoViewIfNeeded();
  const before = await feedback.boundingBox();
  await button.click();
  await expect(feedback).toHaveText("Prompt copied.");
  await expect(button).toBeFocused();
  const after = await feedback.boundingBox();
  expect(after?.height).toBe(before?.height);
  expect(after?.y).toBe(before?.y);
});

test("wrapped copy failure keeps its allocated space", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
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
  await page.goto("prompts/issue-02-study-001");
  const button = page.getByRole("button", { name: "Copy prompt", exact: true });
  const feedback = page.locator(".prompt-card .copy-feedback");
  await button.scrollIntoViewIfNeeded();
  const before = await feedback.boundingBox();
  await button.click();
  await expect(feedback).toHaveText(
    "Copy unavailable. Select the prompt text to copy it.",
  );
  await expect(button).toBeFocused();
  const after = await feedback.boundingBox();
  expect(after?.height).toBe(before?.height);
  expect(after?.y).toBe(before?.y);
});

test("Studio failure stays visible beside its controls without moving them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
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
  await page.goto("prompts/issue-02-study-001");
  await page.getByRole("button", { name: "Customize prompt" }).click();
  const status = page.getByRole("status", { name: "Copy feedback" });
  const button = page.getByRole("button", { name: "Copy Modified Prompt" });
  const before = await button.boundingBox();
  await button.click();
  await expect(status).toHaveText(
    "Copy unavailable. Select the preview text to copy it.",
  );
  await expect(button).toBeFocused();
  const after = await button.boundingBox();
  const bounds = await status.boundingBox();
  expect(after?.y).toBe(before?.y);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(700);
});

test("Compare Lab reports failed copy within the visible dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
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
  await page.goto("prompts");
  for (const card of [
    page.locator(".archive-grid .study-card").nth(0),
    page.locator(".archive-grid .study-card").nth(1),
  ]) {
    await card.getByRole("button", { name: /^More actions for Study/ }).click();
    await card
      .getByRole("button", { name: /^Add Study \d+ to compare$/ })
      .click();
  }
  await page.getByRole("button", { name: "Compare 2 studies ⇄" }).click();
  const dialog = page.getByRole("dialog", { name: "Compare Lab", exact: true });
  const button = dialog
    .getByRole("button", { name: "Copy Raw", exact: true })
    .first();
  await button.scrollIntoViewIfNeeded();
  const status = dialog.getByRole("status");
  const before = await status.boundingBox();
  await button.click();
  await expect(status).toHaveText(
    "Copy unavailable. Select the prompt text to copy it.",
  );
  await expect(button).toBeFocused();
  const after = await status.boundingBox();
  expect(after?.height).toBe(before?.height);
  expect(after!.y).toBeGreaterThanOrEqual(0);
  expect(after!.y + after!.height).toBeLessThanOrEqual(700);
});
