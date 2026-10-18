import { test, expect } from "@playwright/test";

test("virtualized filmstrip centers distant pages, scrolls end to end, and keeps keyboard access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("issues/the-prompt-issue/pages/95");
  await page.getByRole("button", { name: "Toggle page thumbnails" }).click();
  const finalPage = Number(
    await page
      .getByRole("slider", { name: "Browse pages" })
      .getAttribute("max"),
  );
  const strip = page.locator(".filmstrip-scroll");
  const active = strip.locator('[aria-current="page"]');
  await expect(active).toHaveAttribute("aria-label", "Jump to page 95");
  await expect.poll(() => strip.locator("img").count()).toBeLessThan(30);
  await expect
    .poll(async () =>
      active.evaluate((button) => {
        const container = button
          .closest(".filmstrip-scroll")!
          .getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        return rect.left >= container.left && rect.right <= container.right;
      }),
    )
    .toBe(true);

  await strip.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });
  const last = strip.getByRole("button").last();
  await expect(last).toHaveAttribute("aria-label", `Jump to page ${finalPage}`);
  await last.click();
  await expect(page).toHaveURL(new RegExp(`pages/${finalPage}`));
  await expect(strip.locator('[aria-current="page"]')).toHaveAttribute(
    "aria-label",
    `Jump to page ${finalPage}`,
  );

  if (
    (await page.locator("#page-viewport").getAttribute("aria-label")) ===
    "Original page canvas"
  ) {
    await expect
      .poll(() =>
        strip.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
      )
      .toBe(true);
  }
  await strip.evaluate((node) => {
    node.scrollLeft = 0;
  });
  const first = strip.getByRole("button", {
    name: "Jump to page 1",
    exact: true,
  });
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/pages\/1(?:\?|$)/);
  await first.focus();
  for (let index = 0; index < 15; index++) await page.keyboard.press("Tab");
  await expect(
    strip.getByRole("button", { name: "Jump to page 16", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/pages\/16(?:\?|$)/);
  await expect.poll(() => strip.locator("img").count()).toBeLessThan(30);
  expect(errors).toEqual([]);
});
