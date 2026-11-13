import { expect, test } from "@playwright/test";

test("explained connections compare prompts and preserve the archive return trail", async ({
  page,
}) => {
  await page.goto("prompts?selection=studio&q=ponytail");
  await expect(page.getByRole("status")).toHaveText("1 study");
  await page
    .getByRole("link", {
      name: "View study Studio Ponytail Portrait",
      exact: true,
    })
    .click();
  await expect(page.locator(".study-article h1")).toHaveText(
    "Studio Ponytail Portrait",
  );
  await page
    .getByRole("navigation", { name: "Inside this study" })
    .getByRole("link", { name: "05 Connections", exact: true })
    .click();
  const connections = page.locator("#connections-issue-02-study-004");
  await expect(connections).toBeFocused();
  await expect(connections.locator(".connection-card")).toHaveCount(3);
  const frame = connections.locator(".connection-card").first();
  await expect(frame.getByRole("heading")).toHaveText(
    "Keep the contrast. Widen the frame.",
  );
  await frame.getByText("Compare prompt language", { exact: true }).click();
  await expect(frame.locator("blockquote").first()).toHaveText(
    "“cropped from mid-torso up”",
  );
  await expect(frame.locator("blockquote").last()).toHaveText(
    "“full-body studio fashion portrait”",
  );
  await frame.getByRole("link").click();
  await expect(page).toHaveURL(/issue-02-study-013\?from=issue-02-study-004$/);
  await expect(
    page.getByRole("complementary", { name: "Visual thread" }),
  ).toContainText("Studio Ponytail Portrait");
  await expect(
    page.locator(".study-connections a[href*='/issue-02-study-004?']"),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "← Back to the starting study", exact: true })
    .click();
  await expect(page.locator("#connections-issue-02-study-004")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "← Prompt archive", exact: true })
    .click();
  await expect(page.getByRole("searchbox")).toHaveValue("ponytail");
  await expect(page.getByRole("status")).toHaveText("1 study");
  await expect(
    page.getByRole("link", {
      name: "View study Studio Ponytail Portrait",
      exact: true,
    }),
  ).toBeFocused();
});
