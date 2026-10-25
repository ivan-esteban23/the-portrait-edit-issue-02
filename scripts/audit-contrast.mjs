import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import postcss from "postcss";
import { createHash } from "node:crypto";
import { checkRenderedContrast } from "./check-rendered-contrast.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = option("--output", "/tmp/portrait-contrast-audit.json");
const base = option(
  "--base-url",
  "http://127.0.0.1:4173/the-portrait-edit-issue-02/",
);
const full = args.includes("--full");
const issues = readdirSync("src/content/issues").map((slug) =>
  JSON.parse(readFileSync(`src/content/issues/${slug}/issue.json`, "utf8")),
);
const studies = readdirSync("src/content/prompts").filter((file) =>
  file.endsWith(".json"),
);
const routes = full
  ? [
      "",
      "about",
      "prompts",
      "missing-route",
      ...issues.flatMap((issue) => [
        `issues/${issue.slug}`,
        ...Array.from(
          { length: issue.pages },
          (_, index) => `issues/${issue.slug}/pages/${index + 1}`,
        ),
      ]),
      ...studies.map((file) => `prompts/${file.slice(0, -5)}`),
    ]
  : [
      "",
      "about",
      "prompts",
      "missing-route",
      "issues/the-prompt-issue",
      "prompts/issue-02-study-001",
      ...[1, 2, 14, 60, 196].map(
        (page) => `issues/the-prompt-issue/pages/${page}`,
      ),
    ];
const inventory = [];
const compiledCss = existsSync("dist/assets")
  ? readdirSync("dist/assets")
      .filter((file) => file.endsWith(".css"))
      .map((file) => `dist/assets/${file}`)
  : [];
for (const file of ["src/styles.css", "legacy/style.css", ...compiledCss]) {
  postcss
    .parse(readFileSync(file, "utf8"), { from: file })
    .walkDecls((declaration) => {
      if (
        !/^(color|background(?:-color|-image)?|font(?:-size)?|opacity|fill|stroke)$/.test(
          declaration.prop,
        ) &&
        !declaration.prop.startsWith("--")
      )
        return;
      const context = [];
      for (
        let parent = declaration.parent;
        parent && parent.type !== "root";
        parent = parent.parent
      )
        context.unshift(
          parent.type === "atrule"
            ? `@${parent.name} ${parent.params}`
            : parent.selector,
        );
      inventory.push({
        file,
        line: declaration.source.start.line,
        context,
        property: declaration.prop,
        value: declaration.value,
      });
    });
}
const tasks = args.includes("--states-only")
  ? []
  : (args.includes("--static-only")
      ? [false]
      : [true, ...(full ? [false] : [])]
    ).flatMap((javaScriptEnabled) =>
      ["light", "dark"].flatMap((theme) =>
        routes.map((route) => ({ theme, route, javaScriptEnabled })),
      ),
    );
const results = [];
let engine;
const fingerprint = createHash("sha256");
for (const file of readdirSync("dist", { recursive: true })
  .filter((file) => /\.(html|css|js)$/.test(file))
  .sort()) {
  fingerprint.update(file);
  fingerprint.update(readFileSync(`dist/${file}`));
}
const buildFingerprint = fingerprint.digest("hex");
if (args.includes("--resume")) {
  const previous = JSON.parse(readFileSync(output, "utf8"));
  if (
    JSON.stringify(previous.inventory) !== JSON.stringify(inventory) ||
    previous.buildFingerprint !== buildFingerprint
  )
    throw new Error("Cannot resume: the audited CSS/build changed");
  results.push(
    ...previous.results.filter((result) => !result.route.startsWith("legacy/")),
  );
  engine = previous.engine;
  for (let index = tasks.length - 1; index >= 0; index--) {
    const task = tasks[index];
    const recorded = results.filter(
      (result) =>
        result.theme === task.theme &&
        result.route === task.route &&
        result.javaScriptEnabled === task.javaScriptEnabled,
    );
    const required = task.route.includes("/pages/")
      ? ["default", task.javaScriptEnabled ? "text" : "static-text"]
      : ["default"];
    if (
      required.every((state) =>
        recorded.some((result) => result.state === state),
      )
    )
      tasks.splice(index, 1);
  }
}
let complete = false;
const writeReport = () => {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify(
      {
        complete,
        buildFingerprint,
        engine,
        rules: ["color-contrast", "image-alt"],
        inventory,
        results,
      },
      null,
      2,
    ) + "\n",
  );
};
let cursor = 0;
async function inspect(page, task, state) {
  if (
    args.includes("--resume") &&
    results.some(
      (result) =>
        result.theme === task.theme &&
        result.route === task.route &&
        result.width === task.width &&
        result.javaScriptEnabled === task.javaScriptEnabled &&
        result.state === state,
    )
  )
    return;
  // Baseline only: the old two-identical-stops gradient paints exactly --bg,
  // but prevents axe from resolving the canvas color. Do not use for final scans.
  if (args.includes("--flatten-solid-canvas"))
    await page.addStyleTag({
      content: "body { background-color: var(--bg); background-image: none; }",
    });
  const builder = new AxeBuilder({ page })
    .options({ resultTypes: ["violations", "incomplete"] })
    .withRules(["color-contrast", "image-alt"]);
  // No frames are used by this site. Run in the audited document rather than
  // opening a second tab per page; this also supports the static snapshots.
  builder.setLegacyMode(true);
  let timer;
  const axe = await Promise.race([
    builder.analyze(),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`axe timed out: ${task.route} ${state}`)),
        45000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  engine ??= axe.testEngine;
  const summarize = (entries) =>
    entries.map((entry) => ({
      id: entry.id,
      nodes: entry.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
        checks: [...node.any, ...node.all, ...node.none].map((check) => ({
          id: check.id,
          data: check.data,
          message: check.message,
        })),
      })),
    }));
  const images = await page.locator("img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src"),
      alt: image.getAttribute("alt"),
      label: image.getAttribute("aria-label"),
      decorative:
        image.alt === "" &&
        Boolean(image.closest(".related-studies-grid, .filmstrip-thumb-btn")),
    })),
  );
  const manualChecks = await checkRenderedContrast(page, axe.incomplete);
  const result = {
    ...task,
    state,
    violations: summarize(axe.violations),
    incomplete: summarize(axe.incomplete),
    images,
    manualChecks,
  };
  results.push(result);
  if (results.length % 50 === 0) writeReport();
  if (result.violations.length)
    console.log(
      JSON.stringify({
        theme: task.theme,
        route: task.route,
        state,
        violations: result.violations,
      }),
    );
  const failedChecks = manualChecks.filter((check) => !check.pass);
  if (failedChecks.length)
    console.log(
      JSON.stringify({
        theme: task.theme,
        route: task.route,
        state,
        failedChecks,
      }),
    );
}
const browser = await chromium.launch({
  headless: true,
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
});
try {
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      let context, page, enabled, instrumentation;
      while (cursor < tasks.length) {
        const task = tasks[cursor++];
        if (enabled !== task.javaScriptEnabled) {
          if (context) await context.close();
          enabled = task.javaScriptEnabled;
          context = await browser.newContext({
            javaScriptEnabled: enabled,
            viewport: { width: 1280, height: 900 },
            reducedMotion: "reduce",
          });
          await context.addInitScript(() =>
            localStorage.setItem("portrait-edit-touch-hint", "dismissed"),
          );
          page = await context.newPage();
          instrumentation = !enabled ? await context.newCDPSession(page) : null;
        }
        if (instrumentation)
          await instrumentation.send("Emulation.setScriptExecutionDisabled", {
            value: true,
          });
        await page.goto(`${base}${task.route}${task.route ? "/" : ""}`, {
          waitUntil: "load",
        });
        if (enabled)
          await page
            .locator(
              task.route.includes("/pages/") ? ".reader-canvas" : "#main h1",
            )
            .waitFor();
        if (instrumentation) {
          // Parse with scripts disabled. Preserve that static DOM before enabling
          // axe's timers: otherwise Chromium hides noscript when instrumentation
          // is enabled. App scripts are removed and the app root stays empty.
          await page.evaluate(() => {
            document
              .querySelectorAll("script")
              .forEach((script) => script.remove());
            document
              .querySelectorAll("noscript")
              .forEach((node) => node.replaceWith(...node.childNodes));
          });
          await instrumentation.send("Emulation.setScriptExecutionDisabled", {
            value: false,
          });
          if (await page.locator("#root").innerHTML())
            throw new Error("Application JavaScript ran in a static audit");
          if (!(await page.locator("body > main").isVisible()))
            throw new Error("Static snapshot is not visible");
        }
        await page.evaluate((theme) => {
          localStorage.setItem("portrait-edit-theme", theme);
          document.documentElement.dataset.theme = theme;
          window.dispatchEvent(
            new CustomEvent("portrait-edit-theme-change", { detail: theme }),
          );
        }, task.theme);
        await page.evaluate(() => document.fonts.ready);
        await inspect(page, task, "default");
        if (enabled && task.route.includes("/pages/")) {
          await page
            .getByRole("button", { name: "Display", exact: true })
            .click();
          await page
            .getByLabel("Reading mode", { exact: true })
            .selectOption("text");
          await page
            .getByRole("button", {
              name: "Close display settings",
              exact: true,
            })
            .click();
          await page.waitForTimeout(100);
          await inspect(page, task, "text");
        } else if (!enabled && task.route.includes("/pages/")) {
          await page
            .getByText("Read this page as text", { exact: true })
            .click();
          await inspect(page, task, "static-text");
        }
        if (cursor % 25 === 0)
          console.log(
            `Audited ${cursor}/${tasks.length} route/theme combinations`,
          );
      }
      if (context) await context.close();
    }),
  );
  if (!args.includes("--routes-only"))
    for (const theme of ["light", "dark"])
      for (const width of [1280, 390]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        await context.addInitScript((theme) => {
          localStorage.setItem("portrait-edit-theme", theme);
          localStorage.setItem("portrait-edit-touch-hint", "dismissed");
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: async () => {
                if (window.auditClipboardFailure)
                  throw Error("Clipboard unavailable");
              },
            },
          });
          document.execCommand = () => false;
        }, theme);
        const page = await context.newPage();
        let route = "";
        const go = async (path) => {
          route = path;
          await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
        };
        const capture = async (state) => {
          await page.waitForTimeout(200);
          await inspect(page, { theme, route, width }, state);
        };
        await go("");
        await page
          .getByRole("button", {
            name: "Search and command palette",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "Command palette", exact: true })
          .waitFor();
        await capture("command-palette");
        await page.keyboard.press("Escape");
        await go("prompts/issue-02-study-005");
        await page
          .getByRole("button", { name: "Save study", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Remove from saved", exact: true })
          .click();
        await capture("bookmark-removal-toast");
        await page.locator(".image-inspect-trigger").hover();
        await capture("image-label-hover");
        await page.locator(".image-inspect-trigger").click();
        await page
          .getByRole("button", { name: "Close image lightbox", exact: true })
          .waitFor();
        await capture("image-lightbox");
        await page
          .getByRole("button", { name: "Close image lightbox", exact: true })
          .click();
        await page.locator(".lightbox-overlay").waitFor({ state: "detached" });
        await page.getByText("More actions", { exact: true }).click();
        await page
          .getByRole("button", { name: "Analyze prompt", exact: true })
          .click();
        await capture("prompt-anatomy");
        await page
          .getByRole("button", { name: "Customize prompt", exact: true })
          .click();
        await page
          .getByRole("radio", { name: "16:9 Cinema", exact: true })
          .click();
        await page.locator(".keyword-chip").first().click();
        await capture("prompt-studio-selected");
        await page.keyboard.press("Escape");
        await go("issues/the-prompt-issue/pages/60");
        await page
          .getByRole("button", { name: "Display", exact: true })
          .click();
        await capture("reader-display-settings");
        await page
          .getByRole("button", { name: "Close display settings", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Toggle page thumbnails", exact: true })
          .click();
        await capture("reader-thumbnails");
        await page
          .getByRole("button", { name: "Table of contents", exact: true })
          .click();
        await capture("reader-chapter-drawer");
        await page.keyboard.press("Escape");
        await go("issues/the-prompt-issue/pages/60?focus=1");
        await page
          .getByRole("button", { name: "Exit Focus", exact: true })
          .waitFor();
        await capture("reader-focus");
        if (width > 1100) {
          await page.locator(".reader-canvas").focus();
          await page.mouse.move(width - 20, 700);
          await page.locator(".reader.chrome-idle").waitFor({ timeout: 6000 });
          await capture("reader-focus-idle");
        }
        await go("prompts");
        await page.locator(".tag-pill").first().click();
        await capture("archive-selected-tag");
        await go("prompts");
        await page
          .locator(".archive-grid .study-card")
          .first()
          .getByRole("button", { name: /^Copy prompt for Study/ })
          .click();
        await capture("archive-copy-feedback");
        for (const card of [
          page.locator(".archive-grid .study-card").nth(0),
          page.locator(".archive-grid .study-card").nth(1),
        ]) {
          await card
            .getByRole("button", { name: /^More actions for Study/ })
            .click();
          await card
            .getByRole("button", { name: /^Add Study \d+ to compare$/ })
            .click();
        }
        await page
          .getByRole("button", { name: "Compare 2 studies ⇄", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Compare Lab", exact: true })
          .waitFor();
        await capture("compare-side-by-side");
        await page
          .getByRole("radio", { name: "Split Curtain", exact: true })
          .click();
        await capture("compare-over-image-labels");
        const frame = await page.locator(".split-curtain-frame").boundingBox();
        await page.mouse.move(
          frame.x + frame.width / 2,
          frame.y + frame.height / 2,
        );
        await page.mouse.down();
        await capture("compare-dragging-labels");
        await page.mouse.up();
        await page.keyboard.press("Escape");
        await page.getByText("Archive tools", { exact: true }).click();
        await page
          .getByRole("button", { name: "Select Prompts", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: /^Select Study/ })
          .first()
          .check();
        await page.evaluate(() => {
          window.auditClipboardFailure = true;
        });
        await page
          .getByRole("button", { name: "Copy Prompts", exact: true })
          .click();
        await capture("batch-copy-error");
        await page.emulateMedia({ media: "print" });
        await capture("archive-print");
        await context.close();
      }
  const legacyUrl = option("--legacy-url");
  if (legacyUrl)
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(legacyUrl, { waitUntil: "networkidle" });
      await inspect(
        page,
        { theme, route: "legacy/", javaScriptEnabled: true },
        "cover",
      );
      await page.goto(`${legacyUrl}#page=60`, { waitUntil: "networkidle" });
      await page.waitForFunction(() =>
        document
          .querySelector("#page-image")
          ?.getAttribute("src")
          ?.includes("060.webp"),
      );
      await inspect(
        page,
        { theme, route: "legacy/#page=60", javaScriptEnabled: true },
        "original-page",
      );
      await page.locator("#reader-preferences > summary").click();
      await page.locator("#reading-mode").selectOption("text");
      await page.waitForFunction(() =>
        document
          .querySelector("#reading-text")
          ?.textContent.includes("Frost Fantasy"),
      );
      await inspect(
        page,
        { theme, route: "legacy/#page=60", javaScriptEnabled: true },
        "text",
      );
      await context.close();
      const staticContext = await browser.newContext({
        colorScheme: theme,
        javaScriptEnabled: false,
      });
      const staticPage = await staticContext.newPage();
      const instrumentation = await staticContext.newCDPSession(staticPage);
      await instrumentation.send("Emulation.setScriptExecutionDisabled", {
        value: true,
      });
      await staticPage.goto(legacyUrl, { waitUntil: "load" });
      await staticPage.evaluate(() => {
        document
          .querySelectorAll("script")
          .forEach((script) => script.remove());
        document
          .querySelectorAll("noscript")
          .forEach((node) => node.replaceWith(...node.childNodes));
      });
      await instrumentation.send("Emulation.setScriptExecutionDisabled", {
        value: false,
      });
      await inspect(
        staticPage,
        { theme, route: "legacy/", javaScriptEnabled: false },
        "static-fallback",
      );
      await staticContext.close();
    }
  complete = true;
} finally {
  await browser.close();
  results.sort((a, b) =>
    `${a.theme}/${a.route}/${a.state}`.localeCompare(
      `${b.theme}/${b.route}/${b.state}`,
    ),
  );
  writeReport();
}
const failures = results.reduce(
  (total, result) =>
    total +
    result.violations.length +
    result.manualChecks.filter((check) => !check.pass).length +
    result.images.filter(
      (image) =>
        !image.src ||
        image.alt === null ||
        (image.alt === "" && !image.decorative),
    ).length,
  0,
);
console.log(
  JSON.stringify({
    output,
    cssDeclarations: inventory.length,
    routeThemeCombinations: tasks.length,
    auditedStates: results.length,
    violations: failures,
  }),
);
if (failures) process.exitCode = 1;
