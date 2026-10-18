import { test, expect } from "@playwright/test";

test("Discord command selections follow card toggles and live Studio presets", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { copied?: string }).copied = text;
        },
      },
    });
  });
  const copied = () =>
    page.evaluate(() => (window as Window & { copied?: string }).copied || "");
  await page.goto("prompts/issue-02-study-005");
  const card = page.getByRole("region", { name: "Image prompt", exact: true });
  const aspect = card.getByRole("checkbox", { name: "--ar 4:5", exact: true });
  await expect(aspect).not.toBeChecked();
  await aspect.check();
  await card
    .getByRole("button", { name: "Discord /imagine", exact: true })
    .click();
  await expect.poll(copied).toContain("--ar 4:5");
  await expect.poll(copied).toMatch(/^\/imagine prompt: /);
  await aspect.uncheck();
  await card
    .getByRole("button", { name: "Discord /imagine", exact: true })
    .click();
  await expect.poll(copied).not.toContain("--ar");
  await card
    .getByRole("button", { name: "Adjust Parameters", exact: true })
    .click();
  const studio = page.getByRole("dialog", {
    name: "Prompt Studio",
    exact: true,
  });
  await expect(studio).toBeVisible();
  await studio.getByRole("radio", { name: "16:9 Cinema", exact: true }).click();
  await studio
    .getByRole("checkbox", { name: "--s 250", exact: true })
    .uncheck();
  await studio
    .getByRole("button", { name: "Copy Discord /imagine", exact: true })
    .click();
  await expect.poll(copied).toContain("--ar 16:9");
  await expect.poll(copied).not.toContain("--s ");
  await expect(
    studio.getByRole("status", { name: "Copy feedback" }),
  ).toHaveText("Discord /imagine command copied.");
  expect(
    await studio.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(studio).toHaveCount(0);
});

test("related cards navigate through detail pages and magazine Reading View", async ({
  page,
}) => {
  await page.goto("prompts/issue-02-study-005");
  const related = page.getByRole("region", {
    name: "Related Studies",
    exact: true,
  });
  await expect(related.getByRole("link")).toHaveCount(4);
  const first = related.getByRole("link").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/\/prompts\/issue-/);
  await first.click();
  await expect(page).toHaveURL(new RegExp(href!.split("/prompts/")[1] + "$"));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goto("issues/the-prompt-issue/pages/60");
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page.getByLabel("Reading mode").selectOption("text");
  await page
    .getByRole("button", { name: "Close display settings", exact: true })
    .click();
  const readerRelated = page.getByRole("region", {
    name: "Related Studies",
    exact: true,
  });
  const readerLink = readerRelated.getByRole("link").first();
  const destination = await readerLink.getAttribute("href");
  expect(destination).toMatch(/\/issues\/the-prompt-issue\/pages\/\d+$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await readerLink.click();
  await expect(page.getByLabel("Page number", { exact: true })).toHaveValue(
    destination!.split("/").pop()!,
  );
});

test("Archive print keeps the current filter and renders a clean two-column contact sheet", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "portrait-edit-saved",
      JSON.stringify(["issue-02-study-006"]),
    );
    window.print = () => {
      (window as Window & { printed?: boolean }).printed = true;
    };
  });
  await page.goto("prompts?q=Frost%20Fantasy%20Portrait");
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Print Contact Sheet 🖨", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { printed?: boolean }).printed),
    )
    .toBe(true);
  await expect(page).toHaveURL(/q=Frost%20Fantasy%20Portrait/);
  await expect(page.locator(".archive-grid .study-card")).toHaveCount(1);
  expect(
    await page
      .locator(".archive-grid img")
      .evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-contact-sheet-header")).toBeVisible();
  await expect(page.locator(".archive-filters")).toBeHidden();
  await expect(page.locator(".masthead")).toBeHidden();
  const styles = await page.locator(".archive-grid").evaluate((node) => ({
    columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
    background: getComputedStyle(document.body).backgroundColor,
    breakInside: getComputedStyle(node.firstElementChild!).breakInside,
  }));
  expect(styles.columns).toBe(2);
  expect(styles.background).toBe("rgb(255, 255, 255)");
  expect(styles.breakInside).toBe("avoid");
});
