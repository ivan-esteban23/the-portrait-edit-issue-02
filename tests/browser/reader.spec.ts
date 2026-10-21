import { openReaderTools } from "./helpers/reader-tools";
import { test, expect, type Page } from "@playwright/test";
const reader = "issues/the-prompt-issue/pages/60";
async function settings(page: Page) {
  await page.getByRole("button", { name: "Display", exact: true }).click();
}
async function mode(page: Page, value: string) {
  await settings(page);
  await page.getByLabel("Reading mode").selectOption(value);
  await page.getByRole("button", { name: "Close display settings" }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
test("publication routes, archive filtering, retained PDF, and not-found", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByRole("link", { name: "Start reading" })).toBeVisible();
  await noOverflow(page);
  const action = page.getByRole("link", { name: "Start reading" });
  const colors = await action.evaluate((e) => ({
    text: getComputedStyle(e).color,
    bg: getComputedStyle(e).backgroundColor,
  }));
  expect(colors.text).not.toBe(colors.bg);
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Inside the issue" }).click();
  await expect(
    page.getByRole("navigation", { name: "Issue chapters" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Download PDF ·/ }),
  ).toHaveAttribute("href", /releases\/download\/noir-editorial-1/);
  await page.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("168 studies");
  await page.getByLabel("Search", { exact: true }).fill("Frost Fantasy");
  await expect(page.getByRole("status")).toHaveText("1 study");
  await page.locator(".archive-grid a").click();
  await expect(
    page.getByRole("heading", { name: "Frost Fantasy Portrait", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Not recorded", { exact: true }).first(),
  ).toBeVisible();
  await noOverflow(page);
  await page.goto("missing-route");
  await expect(
    page.getByRole("link", { name: "Back to the reader" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("reader modes, Focus, exact copy, editable input and responsive layout", async ({
  page,
}, info) => {
  await page.goto(reader);
  const width = page.viewportSize()!.width;
  if (width < 768) await expect(page.locator(".study-article")).toBeVisible();
  else await expect(page.locator(".page-art")).toBeVisible();
  await mode(page, "text");
  await expect(
    page.getByRole("heading", { name: "Frost Fantasy Portrait", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.locator(".masthead")).toHaveCount(0);
  await page.screenshot({
    path: `test-results/${info.project.name}-focus-reading.png`,
    fullPage: true,
  });
  await noOverflow(page);
  if (width <= 1100) {
    await expect(page.locator(".chapter-strip")).toBeHidden();
    expect(
      await page
        .locator(".reader-bottom")
        .evaluate((e) => getComputedStyle(e).position),
    ).toBe("fixed");
  }
  await settings(page);
  await page.getByRole("button", { name: "20 px" }).click();
  for (const control of await page.locator("input,select").all())
    expect(
      await control.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  await page.getByRole("button", { name: "Close display settings" }).click();
  expect(
    await page
      .locator(".prompt-body")
      .evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe("20px");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  await expect(page.locator(".copy-feedback")).toHaveText("Prompt copied.");
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toEqual(await page.locator(".prompt-body").textContent());
  await page.getByLabel("Page number", { exact: true }).fill("152");
  await page.getByLabel("Page number", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/pages\/152/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Exit Focus" })).toBeVisible();
  await page.getByRole("button", { name: "Exit Focus" }).click();
  await expect(page.locator(".masthead")).toBeVisible();
});
test("keyboard, scrubber and legacy hash links", async ({ page }) => {
  await page.goto("./#page=60");
  await expect(page).toHaveURL(/pages\/60/);
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/pages\/61/);
  await page.keyboard.press("K");
  await expect(page).toHaveURL(/pages\/60/);
  await page.keyboard.press("f");
  await expect(page.getByRole("button", { name: "Exit Focus" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Focus", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/focus=0/);
  await page.getByLabel("Page number", { exact: true }).focus();
  await expect(page.getByLabel("Page number", { exact: true })).toBeFocused();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/pages\/60/);
  const range = page.getByRole("slider", { name: "Browse pages" });
  await range.focus();
  await range.press("End");
  await expect(page).toHaveURL(/pages\/196/);
  await expect(range).toHaveAttribute("aria-valuetext", "Page 196 of 196");
  await page.getByRole("button", { name: "−10 pages" }).click();
  await expect(page).toHaveURL(/pages\/186/);
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/pages\/1(?:\?|$)/);
  await expect(
    page.getByRole("button", { name: "← Previous", exact: true }),
  ).toBeDisabled();
});
test("original page loading, image-only retry and zoom", async ({
  page,
}, info) => {
  await page.route("**/pages/060.webp", (route) => route.abort());
  await page.goto(reader);
  await mode(page, "page");
  await expect(page.getByText("This page could not load.")).toBeVisible();
  await page.unroute("**/pages/060.webp");
  await page.getByRole("button", { name: "Retry page" }).click();
  await expect(page.locator(".page-art")).toHaveClass(/loaded/);
  await settings(page);
  await page.getByLabel("Zoom", { exact: true }).selectOption("150");
  await page.getByRole("button", { name: "Close display settings" }).click();
  await expect(page.locator(".page-holder")).toHaveAttribute("style", /150%/);
  await noOverflow(page);
  await settings(page);
  await page.getByLabel("Zoom", { exact: true }).selectOption("100");
  await page.getByRole("button", { name: "Close display settings" }).click();
  await page.screenshot({
    path: `test-results/${info.project.name}-original.png`,
    fullPage: true,
  });
});
test("both canvases accept horizontal swipes, ignore vertical and multiple touches", async ({
  page,
}) => {
  await page.goto(reader);
  async function swipe(dx: number, dy: number, multi = false) {
    await page.locator(".reader-canvas").evaluate(
      (node, args) => {
        const touch = (x: number, y: number, id = 1) =>
          new Touch({ identifier: id, target: node, clientX: x, clientY: y });
        node.dispatchEvent(
          new TouchEvent("touchstart", {
            bubbles: true,
            touches: args.multi
              ? [touch(220, 220), touch(250, 250, 2)]
              : [touch(220, 220)],
          }),
        );
        node.dispatchEvent(
          new TouchEvent("touchmove", {
            bubbles: true,
            touches: [touch(220 + args.dx, 220 + args.dy)],
          }),
        );
        node.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            touches: [],
            changedTouches: [touch(220 + args.dx, 220 + args.dy)],
          }),
        );
      },
      { dx, dy, multi },
    );
  }
  for (const view of ["text", "page"]) {
    await mode(page, view);
    await swipe(-100, 10);
    await expect(page).toHaveURL(/pages\/61/);
    await swipe(100, 10);
    await expect(page).toHaveURL(/pages\/60/);
    await swipe(-100, 200);
    await expect(page).toHaveURL(/pages\/60/);
    await swipe(-100, 0, true);
    await expect(page).toHaveURL(/pages\/60/);
  }
});
test("desktop Focus dims chrome and wakes on activity", async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 1100, "Desktop-only behavior");
  await page.goto(reader + "?focus=1");
  await page.locator(".reader-canvas").focus();
  await page.mouse.move(900, 600);
  await expect(page.locator(".reader")).toHaveClass(/chrome-idle/, {
    timeout: 6000,
  });
  await page.mouse.move(901, 601);
  await expect(page.locator(".reader")).not.toHaveClass(/chrome-idle/);
});

test("explicit themes ignore the OS preference and form controls retain cross-platform legibility", async ({
  page,
}) => {
  await page.goto(reader);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await settings(page);
  for (const control of await page.locator("input,select").all())
    expect(
      await control.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  await page.getByRole("button", { name: "Close display settings" }).click();
  await page.goto("issues/the-prompt-issue/pages/1");
  await mode(page, "text");
  await expect(page.locator(".reading-cover")).toBeVisible();
});

test("rapid page and Focus keys use the latest route", async ({ page }) => {
  await page.goto(reader);
  await page.locator(".reader-canvas").focus();
  await page.locator(".reader-canvas").evaluate((node) => {
    for (const key of ["j", "j", "K", "f", "Escape"])
      node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await expect(page).toHaveURL(/pages\/61\?focus=0/);
  await expect(
    page.getByRole("button", { name: "Focus", exact: true }),
  ).toBeVisible();
  const field = page.getByLabel("Page number", { exact: true });
  await field.focus();
  await field.press("j");
  await expect(page).toHaveURL(/pages\/61\?focus=0/);
});

test("page turns return long reading views to the beginning", async ({
  page,
}) => {
  await page.goto(reader);
  await mode(page, "text");
  const next = page.getByRole("button", { name: "Next →", exact: true });
  await next.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await next.click();
  await expect(page).toHaveURL(/pages\/61/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(next).toBeFocused();
});

test("command palette spread changes update the current reader immediately", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1150,
    "Spread requires desktop width",
  );
  await page.goto(reader);
  const toggle = async () => {
    await page
      .getByRole("button", { name: "Search and command palette" })
      .click();
    const search = page.getByPlaceholder(/Type a command/);
    await search.fill("Toggle Two-Page Spread");
    // Wait for filtering and selection before submitting the keyboard command.
    await expect(page.getByRole("dialog").getByRole("option")).toHaveCount(1);
    await expect(
      page.getByRole("option", { name: /^Toggle Two-Page Spread/ }),
    ).toHaveAttribute("aria-selected", "true");
    await search.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };
  await toggle();
  await expect(page.locator(".spread-stage")).toBeVisible();
  await toggle();
  await expect(page.locator(".spread-stage")).toHaveCount(0);
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("s");
  await expect(page.locator(".spread-stage")).toBeVisible();
  await page.keyboard.press("s");
  await expect(page.locator(".spread-stage")).toHaveCount(0);
});

test("Prompt Studio traps focus and blocks reader shortcuts until closed", async ({
  page,
}) => {
  await page.goto(reader);
  await mode(page, "text");
  const opener = page.getByRole("button", {
    name: "Adjust Parameters in Prompt Studio",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Prompt Studio",
    exact: true,
  });
  const close = dialog.getByRole("button", {
    name: "Close Prompt Studio",
    exact: true,
  });
  await expect(close).toBeFocused();
  await dialog.getByRole("button", { name: "Done", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Done", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/pages\/60$/);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/pages\/61$/);
});

test("spread pagination has a single cover and turns whole visible spreads", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1150,
    "Spread requires desktop width",
  );
  await page.addInitScript(() =>
    localStorage.setItem("portrait-edit-spread", "true"),
  );
  await page.goto("issues/the-prompt-issue/pages/1");
  const previous = page.getByRole("button", {
    name: "← Previous",
    exact: true,
  });
  const next = page.getByRole("button", { name: "Next →", exact: true });
  const nav = page.getByRole("navigation", { name: "Bottom page navigation" });
  await expect(page.locator(".page-art")).toHaveCount(1);
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page).toHaveURL(/pages\/2$/);
  await expect(page.locator(".page-art")).toHaveCount(2);
  await expect(nav).toContainText("2–3 / 196");
  await expect(page.locator("#page-viewport")).toHaveCount(1);
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/pages\/4$/);
  await previous.click();
  await expect(page).toHaveURL(/pages\/2$/);
  await previous.click();
  await expect(page).toHaveURL(/pages\/1$/);
  await page.locator(".reader-canvas").focus();
  await page.locator(".reader-canvas").evaluate((node) => {
    for (const key of ["j", "j"])
      node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await expect(page).toHaveURL(/pages\/4$/);
  await page.goto("issues/the-prompt-issue/pages/3");
  await expect(nav).toContainText("2–3 / 196");
  await next.click();
  await expect(page).toHaveURL(/pages\/4$/);
  await page.goto("issues/the-prompt-issue/pages/196");
  await expect(page.locator(".page-art")).toHaveCount(1);
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(page).toHaveURL(/pages\/194$/);
  await expect(nav).toContainText("194–195 / 196");
});

test("trackpad navigation ignores vertical scroll and inertia and resets after zoom", async ({
  page,
}) => {
  await page.goto(reader);
  await mode(page, "page");
  await page.clock.install();
  const canvas = page.locator(".reader-canvas");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "scale", {
      configurable: true,
      value: 2,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(canvas).toHaveCSS("touch-action", "auto");
  await canvas.dispatchEvent("wheel", { deltaX: 40 });
  await expect(page).toHaveURL(/pages\/60$/);
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "scale");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(canvas).toHaveCSS("touch-action", "pan-y pinch-zoom");
  await canvas.dispatchEvent("wheel", { deltaX: 40, deltaY: 50 });
  await canvas.dispatchEvent("wheel", { deltaX: 34, deltaY: 0 });
  await expect(page).toHaveURL(/pages\/60$/);
  await canvas.evaluate((node) => {
    for (let i = 0; i < 5; i++)
      node.dispatchEvent(
        new WheelEvent("wheel", { bubbles: true, deltaX: 40 }),
      );
  });
  await expect(page).toHaveURL(/pages\/61$/);
  await page.clock.fastForward(400);
  await canvas.dispatchEvent("wheel", { deltaX: -40 });
  await expect(page).toHaveURL(/pages\/60$/);
  await settings(page);
  await page.getByLabel("Zoom", { exact: true }).selectOption("150");
  await page.getByRole("button", { name: "Close display settings" }).click();
  await expect(canvas).toHaveCSS("touch-action", "auto");
  await canvas.dispatchEvent("wheel", { deltaX: 40 });
  await expect(page).toHaveURL(/pages\/60$/);
  await settings(page);
  await page.getByLabel("Zoom", { exact: true }).selectOption("100");
  await page.getByRole("button", { name: "Close display settings" }).click();
  await expect(canvas).toHaveCSS("touch-action", "pan-y pinch-zoom");
  await canvas.dispatchEvent("wheel", { deltaX: 40 });
  await expect(page).toHaveURL(/pages\/61$/);
});

test("mobile dock clearance follows its rendered height and resets on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(reader);
  const dock = page.locator(".reader-bottom");
  await expect(dock).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const height = document
          .querySelector(".reader-bottom")!
          .getBoundingClientRect().height;
        return (
          Math.abs(
            parseFloat(
              document.documentElement.style.getPropertyValue(
                "--reader-bottom-height",
              ),
            ) - height,
          ) < 1
        );
      }),
    )
    .toBe(true);
  await dock.evaluate((node) => {
    node.style.paddingBottom = "80px";
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const height = document
          .querySelector(".reader-bottom")!
          .getBoundingClientRect().height;
        return (
          parseFloat(
            getComputedStyle(document.querySelector(".reader")!).paddingBottom,
          ) >=
          height + 23.5
        );
      }),
    )
    .toBe(true);
  await noOverflow(page);
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(dock).not.toHaveCSS("position", "fixed");
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue(
          "--reader-bottom-height",
        ),
      ),
    )
    .toBe("");
  await noOverflow(page);
});

test("theme controls, shortcuts, and browser tabs share the same preference", async ({
  page,
}) => {
  await page.goto(reader);
  const mastheadTheme = page.locator(".masthead-theme-toggle");
  await mastheadTheme.click();
  await expect(mastheadTheme).toHaveAttribute("aria-label", /light/);
  await settings(page);
  const displayTheme = page.getByRole("dialog").getByLabel("Color theme");
  await expect(displayTheme).toHaveValue("light");
  await displayTheme.selectOption("dark");
  await expect(mastheadTheme).toHaveAttribute("aria-label", /dark/);
  await page.getByRole("button", { name: "Close display settings" }).click();
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("m");
  await expect(mastheadTheme).toHaveAttribute("aria-label", /light/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 244, 239)",
  );
  await mastheadTheme.click();
  await expect(mastheadTheme).toHaveAttribute("aria-label", /dark/);
  const other = await page.context().newPage();
  try {
    await other.goto(reader);
    const otherTheme = other.locator(".masthead-theme-toggle");
    await expect(otherTheme).toHaveAttribute("aria-label", /dark/);
    await otherTheme.click();
    await expect(mastheadTheme).toHaveAttribute("aria-label", /light/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await other.evaluate(() => localStorage.clear());
    await expect(mastheadTheme).toHaveAttribute("aria-label", /dark/);
  } finally {
    await other.close();
  }
});

test("variable fonts optically adapt between reading and display sizes", async ({
  page,
}) => {
  await page.goto("prompts/issue-02-study-005");
  await expect(
    page.getByRole("heading", { name: "Frost Fantasy Portrait", exact: true }),
  ).toBeVisible();
  const differences = await page.evaluate(async () => {
    const measured: { family: string; difference: number }[] = [];
    for (const [family, size] of [
      ["Newsreader Variable", 72],
      ["Inter Variable", 32],
    ] as const) {
      await document.fonts.load(`400 ${size}px "${family}"`);
      const sample = document.createElement("span");
      sample.textContent = "Editorial typography reads naturally.";
      Object.assign(sample.style, {
        position: "fixed",
        left: "-10000px",
        whiteSpace: "pre",
        fontFamily: `"${family}"`,
        fontSize: `${size}px`,
        fontWeight: "400",
        fontOpticalSizing: "auto",
      });
      document.body.append(sample);
      try {
        const optical = sample.getBoundingClientRect().width;
        sample.style.fontOpticalSizing = "none";
        measured.push({
          family,
          difference: Math.abs(optical - sample.getBoundingClientRect().width),
        });
      } finally {
        sample.remove();
      }
    }
    return measured;
  });
  for (const result of differences)
    expect(result.difference, result.family).toBeGreaterThan(0.1);
  await noOverflow(page);
});

test("unavailable web fonts preserve readable layout and navigation", async ({
  page,
}, info) => {
  let blocked = 0;
  await page.route("**/*.woff2", async (route) => {
    blocked++;
    await route.abort();
  });
  await page.goto(reader);
  await mode(page, "text");
  await expect(
    page.getByRole("heading", { name: "Frost Fantasy Portrait", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(blocked).toBeGreaterThan(0);
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-fallback-fonts.png`,
  });
  const number = page.getByLabel("Page number", { exact: true });
  await number.fill("61");
  await number.press("Enter");
  await expect(page).toHaveURL(/pages\/61$/);
  await noOverflow(page);
});

test("accessibility: shortcuts and lightbox trap focus and restore external triggers", async ({
  page,
}) => {
  await page.goto(reader);
  await openReaderTools(page);
  const opener = page.getByRole("button", {
    name: "Keyboard shortcuts",
    exact: true,
  });
  for (const dismissal of ["Escape", "button", "overlay"]) {
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: "Keyboard Shortcuts",
      exact: true,
    });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    const close = dialog.getByRole("button", {
      name: "Close shortcuts cheatsheet",
    });
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("j");
    await expect(page).toHaveURL(/pages\/60$/);
    if (dismissal === "Escape") await page.keyboard.press("Escape");
    else if (dismissal === "button") await close.click();
    else
      await page
        .locator(".shortcuts-modal-overlay")
        .click({ position: { x: 2, y: 2 } });
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  await mode(page, "page");
  const inspect = page.getByRole("button", {
    name: "Inspect page 60 in detail",
  });
  await inspect.focus();
  await page.keyboard.press("Enter");
  const lightbox = page.getByRole("dialog", { name: "Issue 02 · Page 60" });
  const close = lightbox.getByRole("button", { name: "Close image lightbox" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(lightbox.getByRole("button", { name: "Zoom in" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await lightbox.getByRole("button", { name: "Zoom in" }).click();
  await close.focus();
  await page.keyboard.press("Tab");
  await expect(
    lightbox.getByRole("button", { name: "Zoom out" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
  await expect(inspect).toBeFocused();
  await noOverflow(page);
});

test("accessibility: reader announces navigation, palette jumps, and Focus changes", async ({
  page,
}) => {
  await page.goto(reader);
  const live = page.locator(".reader-announcer");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveAttribute("aria-atomic", "true");
  await expect(live).toHaveText(
    "Page 60 of 196: Study 005 - Frost Fantasy Portrait",
  );
  await page
    .locator(".reader-bottom")
    .getByRole("button", { name: "Next →", exact: true })
    .click();
  await expect(live).toHaveText(/Page 61 of 196: Study \d{3} - .+/);
  await page.keyboard.press("Control+k");
  await page.locator(".palette-search-input").fill("62");
  await page.getByRole("option", { name: /Jump to Page 62/ }).click();
  await expect(live).toHaveText(/Page 62 of 196: Study \d{3} - .+/);
  const range = page.getByRole("slider", { name: "Browse pages" });
  await range.focus();
  await range.press("End");
  await expect(live).toHaveText(/Page 196 of 196: Study \d{3} - .+/);
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("f");
  await expect(live).toHaveText("Focus mode activated");
  await page.keyboard.press("f");
  await expect(live).toHaveText("Focus mode deactivated");
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("End");
  await expect(live).toHaveText("Focus mode deactivated");
});

test("accessibility: focus rings meet theme contrast and respect forced colors; skip link reaches main", async ({
  page,
}) => {
  await page.goto(reader);
  await expect(page.locator(".reader-announcer")).toContainText(
    "Page 60 of 196:",
  );
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await skip.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page).toHaveURL(/#main$/);
  const display = page.getByRole("button", { name: "Display", exact: true });
  await display.click();
  const theme = page.getByRole("dialog").getByLabel("Color theme");
  for (const value of ["light", "dark"]) {
    await theme.selectOption(value);
    await page.getByRole("button", { name: "Close display settings" }).click();
    await display.focus();
    const contrast = await display.evaluate((node) => {
      const style = getComputedStyle(node);
      const luminance = (color: string) => {
        const rgb = color
          .match(/\d+(?:\.\d+)?/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => v / 255)
          .map((v) =>
            v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const ring = luminance(style.outlineColor);
      const background = luminance(
        getComputedStyle(document.body).backgroundColor,
      );
      return (
        (Math.max(ring, background) + 0.05) /
        (Math.min(ring, background) + 0.05)
      );
    });
    expect(contrast, value).toBeGreaterThanOrEqual(3);
    if (value === "light") await display.click();
  }
  await page.emulateMedia({ forcedColors: "active" });
  await display.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(display).toHaveCSS("outline-style", "solid");
  await expect(display).toHaveCSS("outline-width", "2px");
  await expect(display).toHaveCSS("outline-offset", "2px");
  const color = await display.evaluate((node) => {
    const reference = document.createElement("span");
    reference.style.color = "Highlight";
    document.body.append(reference);
    const expected = getComputedStyle(reference).color;
    reference.remove();
    return { actual: getComputedStyle(node).outlineColor, expected };
  });
  expect(color.actual).toBe(color.expected);
});

test("accessibility: coarse-pointer reader and modal controls have 48px targets", async ({
  page,
}) => {
  test.skip(
    !(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)),
    "Touch devices only",
  );
  await page.goto(reader);
  async function checkTargets(selector: string) {
    for (const control of await page.locator(selector).all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(
        box!.width,
        (await control.getAttribute("aria-label")) ||
          (await control.textContent()) ||
          selector,
      ).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
  }
  await checkTargets(
    ".reader-top :is(button,a,input,select), .reader-bottom button, .scrubber :is(button,input)",
  );
  await openReaderTools(page);
  await page
    .getByRole("button", { name: "Keyboard shortcuts", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Keyboard Shortcuts", exact: true }),
  ).toBeVisible();
  await checkTargets(".shortcuts-modal-card button");
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await mode(page, "page");
  await page.getByRole("button", { name: "Inspect page 60 in detail" }).click();
  await expect(
    page.getByRole("dialog", { name: "Issue 02 · Page 60", exact: true }),
  ).toBeVisible();
  await checkTargets(".lightbox-controls button");
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/accessibility-lightbox-${page.viewportSize()!.width}.png`,
  });
});

test("accessibility: Compare Lab contains focus and restores it through a nested lightbox", async ({
  page,
}) => {
  await page.goto("prompts");
  for (const card of [
    page.locator(".archive-grid .study-card").nth(0),
    page.locator(".archive-grid .study-card").nth(1),
  ]) {
    await card.getByRole("button", { name: /^More actions for Study/ }).click();
    await card
      .getByRole("button", { name: /^Add Study \d+ to compare$/ })
      .click();
  }
  const opener = page.getByRole("button", { name: "Compare 2 studies ⇄" });
  await opener.click();
  const compare = page.getByRole("dialog", {
    name: "Compare Lab",
    exact: true,
  });
  const close = compare.getByRole("button", { name: "Close compare lab" });
  await expect(close).toBeFocused();
  await compare
    .getByRole("button", { name: "Markdown", exact: true })
    .last()
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    compare.getByRole("button", { name: "Copy Combined Prompt" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    compare.getByRole("radio", { name: "Side by Side" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    compare.getByRole("button", { name: "Copy Combined Prompt" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    compare.getByRole("button", { name: "Markdown", exact: true }).last(),
  ).toBeFocused();
  const inspect = compare.locator(".compare-inspect-btn").first();
  await inspect.click();
  const lightbox = page.getByRole("dialog", { name: /^Study #/ });
  await expect(
    lightbox.getByRole("button", { name: "Close image lightbox" }),
  ).toBeFocused();
  // The top layer receives pointer events, and Escape leaves the underlying dialog open.
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
  await expect(compare).toBeVisible();
  await expect(inspect).toBeFocused();
  await compare.getByRole("radio", { name: "Split Curtain" }).click();
  const slider = compare.getByRole("slider", {
    name: "Curtain comparison slider",
  });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "54");
  await noOverflow(page);
  await close.click();
  await expect(compare).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("accessibility: spread announcements describe both studies and the unpaired final page", async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 1150,
    "Spread requires desktop width",
  );
  await page.addInitScript(() =>
    localStorage.setItem("portrait-edit-spread", "true"),
  );
  await page.goto(reader);
  const live = page.locator(".reader-announcer");
  await expect(live).toHaveText(
    /Pages 60 and 61 of 196: Study 005 - Frost Fantasy Portrait and Study \d{3} - .+/,
  );
  await page.locator(".reader-canvas").focus();
  await page.keyboard.press("End");
  await expect(live).toHaveText(/Page 196 of 196: Study \d{3} - .+/);
});
