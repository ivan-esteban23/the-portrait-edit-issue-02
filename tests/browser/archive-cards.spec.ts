import { test, expect } from "@playwright/test";
import study from "../../src/content/prompts/issue-02-study-001.json" with { type: "json" };
import { formatPromptText } from "../../src/lib/promptFormatter";

for (const viewport of [
  { name: "small phone", width: 320, height: 740 },
  { name: "phone", width: 390, height: 844 },
  { name: "large phone", width: 430, height: 932 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
]) {
  test(`${viewport.name}: archive portraits stay clear with compact, reachable actions`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    // Android Chromium exposes Web Share; the layout must fit when it is present.
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => {},
      }),
    );
    await page.goto("prompts");
    await expect(
      page.getByRole("heading", { name: "Portrait prompts" }),
    ).toBeVisible({ timeout: 30_000 });
    const card = page.locator(".archive-grid .study-card").first();
    const media = card.locator(".study-card-media");
    await expect(media.locator("img")).toBeVisible();
    await expect(
      media.locator("button, .card-actions, .study-card-image-caption"),
    ).toHaveCount(0);
    const actions = card.getByRole("group", {
      name: "Actions for Study 1",
      exact: true,
    });
    const mediaBox = (await media.boundingBox())!;
    expect((await actions.boundingBox())!.y).toBeGreaterThanOrEqual(
      mediaBox.y + mediaBox.height,
    );
    await expect(actions.locator(":scope > button")).toHaveCount(3);
    for (const button of await actions.locator(":scope > button").all()) {
      const box = (await button.boundingBox())!;
      expect(Math.round(box.width * 100) / 100).toBeGreaterThanOrEqual(48);
      expect(Math.round(box.height * 100) / 100).toBeGreaterThanOrEqual(48);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const more = card.getByRole("button", {
      name: "More actions for Study 1",
      exact: true,
    });
    await more.click();
    await expect(
      card.getByRole("button", { name: "Share Study 1", exact: true }),
    ).toBeVisible();
    const menuBox = (await card.locator(".study-card-menu").boundingBox())!;
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.keyboard.press("Escape");
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await card
      .getByRole("button", { name: "Save Study 1", exact: true })
      .click();
    await expect(
      card.getByRole("button", {
        name: "Remove Study 1 from saved",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .locator(".archive-grid")
      .evaluate((node) =>
        window.scrollTo(
          0,
          window.scrollY + node.getBoundingClientRect().top - 24,
        ),
      );
    await page.screenshot({
      path: `test-results/${info.project.name}-${viewport.name}-archive-cards.png`,
    });
  });
}

test("archive cards preserve full source framing on phones and desktop", async ({
  page,
}) => {
  const studyNumbers = [
    14, 15, 16, 17, 18, 64, 84, 85, 89, 117, 125, 129, 130, 131, 142, 162, 163,
  ];

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("prompts");
    const cards = page.locator(".archive-grid .study-card");
    await cards.first().waitFor();

    for (const studyNumber of studyNumbers) {
      const card = cards
        .filter({ hasText: `Study ${String(studyNumber).padStart(3, "0")}` })
        .first();
      const image = card.locator(".study-card-media img");
      await image.scrollIntoViewIfNeeded();
      const fit = await image.evaluate(
        (node) => getComputedStyle(node).objectFit,
      );
      expect(fit, `Study ${studyNumber} at ${viewport.width}px`).toBe(
        "contain",
      );
    }
  }
});

test("card actions copy, share, compare, and filter without opening the study", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          sessionStorage.setItem("test-copied", text);
        },
      },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { url: string }) => {
        sessionStorage.setItem("test-shared", data.url);
      },
    });
  });
  await page.goto("prompts");
  const card = page.locator(".archive-grid .study-card").first();
  await card
    .getByRole("button", { name: "Copy prompt for Study 1", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("test-copied")))
    .toBe(study.prompt);
  const more = card.getByRole("button", {
    name: "More actions for Study 1",
    exact: true,
  });
  for (const [label, expected] of [
    ["Copy with parameters", formatPromptText(study, "params")],
    ["Copy as Markdown", `### ${study.title}`],
  ]) {
    await more.click();
    await card.getByRole("button", { name: label, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("test-copied")))
      .toContain(expected);
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute("aria-expanded", "false");
  }
  await more.click();
  await card
    .getByRole("button", { name: "Share Study 1", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("test-shared")))
    .toContain(`/prompts/${study.id}`);
  await more.click();
  await card
    .getByRole("button", { name: "Add Study 1 to compare", exact: true })
    .click();
  await expect(more).toHaveClass(/is-comparing/);
  await expect(page).toHaveURL(/\/prompts$/);
  await more.click();
  await page
    .getByRole("heading", { name: "Portrait prompts", exact: true })
    .click();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await card
    .getByRole("button", { name: `#${study.tags[0]}`, exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`tag=${encodeURIComponent(study.tags[0])}`),
  );
});

test("More actions supports keyboard entry, Escape at the trigger, and natural Tab dismissal", async ({
  page,
}) => {
  await page.goto("prompts");
  const card = page.locator(".archive-grid .study-card").first();
  const more = card.getByRole("button", {
    name: "More actions for Study 1",
    exact: true,
  });
  const compare = card.getByRole("button", {
    name: "Add Study 1 to compare",
    exact: true,
  });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(compare).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  await page.keyboard.press("Space");
  await expect(compare).toBeFocused();
  const items = card.locator(".study-card-menu button");
  const count = await items.count();
  for (let index = 0; index < count; index++) await page.keyboard.press("Tab");
  await expect(card.locator(".study-card-overlay")).toBeFocused();
  await expect(more).toHaveAttribute("aria-expanded", "false");

  await more.focus();
  await page.keyboard.press("Enter");
  await expect(compare).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(more).toHaveAttribute("aria-expanded", "false");
});
