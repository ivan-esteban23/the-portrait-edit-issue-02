import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

const pdf =
  "https://github.com/ivan-esteban23/the-portrait-edit-issue-02/releases/download/noir-editorial-1/The_Portrait_Edit_Issue_02.pdf";
const notes = "https://github.com/ivan-esteban23/the-portrait-edit";

test("publication links navigate without JavaScript", async ({ page }) => {
  // Keep this check independent of GitHub availability while exercising native navigation.
  for (const url of [pdf, notes])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "text/html", body: "Publication resource" }),
    );
  await page.goto("./");
  await expect(
    page.getByRole("link", { name: "Download original PDF", exact: true }),
  ).toHaveAttribute("href", pdf);
  await page
    .getByRole("link", { name: "Download original PDF", exact: true })
    .click();
  await expect(page).toHaveURL(pdf);
  await page.goBack();
  await page
    .getByRole("link", { name: "Source & production notes", exact: true })
    .click();
  await expect(page).toHaveURL(notes);
});

test("home fallback preserves its content and scoped build URLs", async ({
  page,
  request,
}) => {
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  const fallback = page.locator("noscript main");
  await expect(fallback.getByRole("heading", { level: 1 })).toHaveText(
    "The Portrait Edit",
  );
  await expect(fallback.locator("p")).toHaveText(
    "Read The Prompt Issue online or open the complete original PDF.",
  );
  await expect(fallback.getByRole("link")).toHaveCount(3);
  await expect(fallback.locator("[style]")).toHaveCount(0);
  const cover = fallback.getByRole("img", {
    name: "The Prompt Issue cover",
    exact: true,
  });
  await expect(cover).toHaveAttribute(
    "src",
    "/the-portrait-edit-issue-02/cover.webp",
  );
  for (const target of ["issues/the-prompt-issue/pages/1/", "cover.webp"]) {
    const resource = await request.get(`/the-portrait-edit-issue-02/${target}`);
    expect(resource.status()).toBe(200);
  }
  const read = fallback.getByRole("link", {
    name: "Read the issue",
    exact: true,
  });
  await expect(read).toHaveAttribute(
    "href",
    "/the-portrait-edit-issue-02/issues/the-prompt-issue/pages/1/",
  );
  const [reader] = await Promise.all([page.waitForNavigation(), read.click()]);
  expect(reader?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Page 1 of 196", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Issue 02, page 1", exact: true }),
  ).toBeVisible();
});

test("static reader serves page images, text, chapters and bounded navigation", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Read the issue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Page 1 of 196", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "← Previous page", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Next page →", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Page 2 of 196", exact: true }),
  ).toBeVisible();
  const image = page.getByRole("img", {
    name: "Issue 02, page 2",
    exact: true,
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByText("Read this page as text", { exact: true }).click();
  await expect(page.locator("pre")).toContainText("EDITOR'S LETTER");
  await page
    .getByRole("link", { name: "Portraits & Light · page 14", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Page 14 of 196", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
  await page.goto("issues/the-prompt-issue/pages/196/");
  await expect(
    page.getByRole("link", { name: "Next page →", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Download original PDF", exact: true }),
  ).toHaveAttribute("href", pdf);
  await expect(
    page.getByRole("link", { name: "Source & production notes", exact: true }),
  ).toHaveAttribute("href", notes);
});
