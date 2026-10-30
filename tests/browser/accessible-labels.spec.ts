import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage controls expose names matching their visible labels", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("");
    const cover = page.locator(".hero-cover");
    await expect(cover).toHaveAccessibleName("Issue 02 — The Prompt Issue ↗");
    await expect(cover).toHaveAttribute("href", /pages\/1$/);
    const search = page.getByRole("button", {
      name: "Search ⌘K, open command palette",
    });
    await expect(search).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+K Meta+K",
    );
    const audit = await new AxeBuilder({ page })
      .withRules(["label-content-name-mismatch"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});

test("reader provides a page heading in original and fallback views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto("issues/the-prompt-issue/pages/60");
  await expect(
    page.getByRole("heading", { level: 1, name: /Issue 02 · Page 60/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page.getByLabel("Reading mode").selectOption("text");
  await page.getByRole("button", { name: "Close display settings" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Frost Fantasy Portrait" }),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});
