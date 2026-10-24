import { test, expect, type Page } from "@playwright/test";

const overview = "issues/the-prompt-issue";

test.beforeEach(async ({ page }, info) => {
  await page.addInitScript(
    (theme) => localStorage.setItem("portrait-edit-theme", theme),
    info.project.use.colorScheme === "light" ? "light" : "dark",
  );
});

async function expectChapterPosition(page: Page) {
  const heading = page.getByRole("heading", { name: "Chapters", exact: true });
  await expect(heading).toBeFocused();
  const geometry = await heading.evaluate((node) => {
    const masthead = document.querySelector(".masthead")!;
    return {
      top: node.getBoundingClientRect().top,
      headerBottom: ["sticky", "fixed"].includes(
        getComputedStyle(masthead).position,
      )
        ? masthead.getBoundingClientRect().bottom
        : 0,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.headerBottom + 12);
  expect(geometry.overflow).toBe(false);
  await expect(
    page
      .getByRole("navigation", { name: "Issue chapters" })
      .getByRole("link")
      .first(),
  ).toBeInViewport();
}

test("issue chapter shortcut starts in view and moves keyboard focus into the directory", async ({
  page,
}) => {
  await page.goto(overview);
  const browse = page.getByRole("link", {
    name: "Browse chapters ↓",
    exact: true,
  });
  await expect(browse).toBeInViewport();
  await expect(
    page.getByRole("link", { name: /^Download PDF · [\d.]+ MB/ }),
  ).toBeAttached();
  await browse.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/issues\/the-prompt-issue#issue-chapters$/);
  await expectChapterPosition(page);
  const links = page
    .getByRole("navigation", { name: "Issue chapters" })
    .getByRole("link");
  await expect(links).toHaveCount(10);
  await page.keyboard.press("Tab");
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(links.nth(1)).toBeFocused();
  const destination = await links.nth(1).getAttribute("href");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL((url) => url.pathname === destination);
  await expect(page.getByLabel("Page number", { exact: true })).toHaveValue(
    destination!.split("/").pop()!,
  );
  await page.goBack();
  await expectChapterPosition(page);
  await page.reload();
  await expectChapterPosition(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await browse.click();
  await expectChapterPosition(page);
});

test("chapter shortcut fits small and landscape phones with resume state and supports reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portrait-edit-last-read",
      JSON.stringify({ "the-prompt-issue": 196 }),
    ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 740, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(overview);
    const browse = page.getByRole("link", {
      name: "Browse chapters ↓",
      exact: true,
    });
    await expect(browse).toBeInViewport();
    await expect(
      page.getByRole("link", {
        name: "Resume reading (Page 196) ↗",
        exact: true,
      }),
    ).toBeAttached();
    await browse.click();
    await expectChapterPosition(page);
  }
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "true";
    };
  });
  await page
    .getByRole("button", { name: "Print contact sheet", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-printed", "true");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".overview-grid")).toBeHidden();
  await expect(page.locator(".print-contact-sheet-header")).toBeVisible();
  await expect(page.locator(".issue-print-studies .study-card")).toHaveCount(
    165,
  );
});
