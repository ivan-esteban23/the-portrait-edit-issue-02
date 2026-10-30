import { expect, test } from "@playwright/test";

test("archive copy failure explains the error and offers a retry", async ({
  page,
}) => {
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
  const card = page.locator(".archive-grid .study-card").first();
  const copy = card.getByRole("button", { name: "Copy prompt for Study 1" });
  await copy.click();
  await expect(card.getByRole("status")).toContainText(
    "Copy unavailable for Study 1",
  );
  await expect(
    card.getByRole("textbox", { name: "Prompt to copy for Study 1" }),
  ).toBeVisible();
  await expect(copy).toHaveAttribute("title", "Copy unavailable");
  await copy.hover();
  await expect(copy.locator(".action-tooltip")).toBeVisible();
  await expect(copy.locator(".action-tooltip")).toHaveText("Copy unavailable");
  await expect(copy).toBeEnabled();
});
