import { expect, test } from "@playwright/test";
import { editorialSelections } from "../../src/content/editorialSelections";
import portrait from "../../src/content/prompts/issue-02-study-004.json" with { type: "json" };

test("editorial selections combine with search and preserve archive return", async ({
  page,
}) => {
  await page.goto("./");
  const discovery = page.getByRole("region", { name: "Editorial selections" });
  await expect(discovery.getByRole("link")).toHaveCount(4);
  for (const selection of editorialSelections) {
    await discovery
      .getByRole("link")
      .filter({
        has: page.getByRole("heading", {
          name: new RegExp(`^${selection.title}`),
        }),
      })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      `${selection.numbers.length} studies`,
    );
    await expect(
      page.getByRole("button", {
        name: `Remove Selection: ${selection.title} filter`,
      }),
    ).toBeVisible();
    if (selection.id === "studio") {
      await page.getByRole("searchbox").fill("ponytail");
      await expect(page.getByRole("status")).toHaveText("1 study");
      await page
        .getByRole("link", {
          name: "View study Studio Ponytail Portrait",
          exact: true,
        })
        .click();
      await expect(page.locator(".standalone-study")).toBeVisible();
      await page
        .getByRole("link", { name: "← Prompt archive", exact: true })
        .click();
      await expect(page.getByRole("searchbox")).toHaveValue("ponytail");
      await expect(page).toHaveURL(/selection=studio&q=ponytail$/);
    }
    await page.goto("./");
  }
});

test("study section shortcuts focus their content and the original prompt stays intact", async ({
  page,
}) => {
  await page.goto("prompts/issue-02-study-004");
  const path = page.getByRole("navigation", { name: "Inside this study" });
  for (const [name, id] of [
    ["03 Notes", "notes"],
    ["04 Try it", "experiment"],
    ["02 Prompt", "prompt"],
    ["01 Reference", "reference"],
  ]) {
    await path.getByRole("link", { name, exact: true }).click();
    await expect(page.locator(`#${id}-${portrait.id}`)).toBeFocused();
  }
  await expect(page.locator(".prompt-body")).toHaveText(portrait.prompt);
  await expect(page.locator(".study-working-notes li")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
