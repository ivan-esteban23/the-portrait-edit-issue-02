import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const base = "/the-portrait-edit-issue-02/";
const checked = new Set();
let localTargets = 0;
function inspect(file) {
  if (checked.has(file)) return;
  checked.add(file);
  const html = readFileSync(file, "utf8");
  const document = new JSDOM(html).window.document;
  const fallback = document.querySelector("noscript");
  assert.ok(fallback?.querySelector("main"), `${file}: missing static main`);
  assert.ok(
    !fallback.innerHTML.includes("%BASE_URL%"),
    `${file}: unresolved base URL`,
  );
  assert.equal(
    fallback.querySelectorAll("[style]").length,
    0,
    `${file}: inline fallback styles`,
  );
  const nested = [];
  for (const element of fallback.querySelectorAll("[href], img[src]")) {
    const value = element.getAttribute("href") ?? element.getAttribute("src");
    if (/^https:\/\//.test(value)) continue;
    assert.ok(
      value.startsWith(base),
      `${file}: unscoped fallback URL ${value}`,
    );
    const relative = decodeURIComponent(
      value.slice(base.length).split(/[?#]/)[0],
    );
    const target = path.resolve("dist", relative);
    assert.ok(
      target.startsWith(path.resolve("dist") + path.sep),
      `Unsafe URL ${value}`,
    );
    const resolved =
      existsSync(target) && statSync(target).isDirectory()
        ? path.join(target, "index.html")
        : target;
    assert.ok(
      existsSync(resolved),
      `${file}: fallback target missing from build: ${value}`,
    );
    localTargets++;
    if (resolved.endsWith(".html")) nested.push(resolved);
  }
  document.defaultView.close();
  for (const next of nested) inspect(next);
}
for (const file of readdirSync("dist", { recursive: true })) {
  if (file === "index.html" || file.endsWith("/index.html"))
    inspect(path.resolve("dist", file));
}
// The 404 response retains the home reading fallback.
inspect(path.resolve("dist/404.html"));
const studies = readdirSync("src/content/prompts")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`src/content/prompts/${f}`, "utf8")))
  .sort((a, b) => a.studyNumber - b.studyNumber);
for (const [index, study] of studies.entries()) {
  const dom = new JSDOM(
    readFileSync(`dist/prompts/${study.id}/index.html`, "utf8"),
  );
  const document = dom.window.document;
  const fallback = document.querySelector("noscript");
  assert.equal(
    document.title,
    `Study #${study.studyNumber}: ${study.title} | The Portrait Edit`,
  );
  const description = study.prompt.replace(/\s+/g, " ").trim();
  assert.equal(
    document.querySelector('meta[name="description"]').content,
    description.length <= 155
      ? description
      : description.slice(0, 154).trimEnd() + "…",
  );
  for (const text of [
    study.prompt,
    study.title,
    study.style,
    study.workingNotes,
  ])
    assert.ok(
      fallback.textContent.includes(text),
      `${study.id}: missing study content`,
    );
  assert.equal(
    fallback.querySelector("img").getAttribute("src"),
    `${base}${study.referenceImage}`,
  );
  assert.ok(
    fallback.querySelector("img").getAttribute("alt").includes(study.title),
  );
  assert.ok(
    fallback.querySelector(
      `a[href="${base}issues/${study.issueSlug}/pages/${study.page}/"]`,
    ),
  );
  for (const [rel, other] of [
    ["prev", studies[index - 1]],
    ["next", studies[index + 1]],
  ]) {
    assert.equal(
      fallback.querySelector(`a[rel="${rel}"]`)?.getAttribute("href"),
      other ? `${base}prompts/${other.id}/` : undefined,
    );
  }
  dom.window.close();
}
const firstPage = readFileSync(
  "dist/issues/the-prompt-issue/pages/1/index.html",
  "utf8",
);
assert.match(firstPage, /Page 1 of 196/);
assert.match(firstPage, /Read this page as text/);
console.log(
  `No-JavaScript build check: ${checked.size} static pages, ${localTargets} local targets; no unresolved base URLs, missing files or inline styles.`,
);
