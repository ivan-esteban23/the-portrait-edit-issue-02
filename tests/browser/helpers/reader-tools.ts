import { expect, type Page } from "@playwright/test";

export async function openReaderTools(page: Page) {
  await expect(page.locator("#reader-toolbar")).toBeVisible();
  const trigger = page.getByRole("button", { name: "Tools", exact: true });
  if (
    (await trigger.isVisible()) &&
    (await trigger.getAttribute("aria-expanded")) !== "true"
  ) {
    await trigger.click();
  }
}
