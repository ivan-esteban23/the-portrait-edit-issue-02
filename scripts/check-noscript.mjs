import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
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
inspect(path.resolve("dist/index.html"));
const firstPage = readFileSync(
  "dist/issues/the-prompt-issue/pages/1/index.html",
  "utf8",
);
assert.match(firstPage, /Page 1 of 196/);
assert.match(firstPage, /Read this page as text/);
console.log(
  `No-JavaScript build check: ${checked.size} static pages, ${localTargets} local targets; no unresolved base URLs, missing files or inline styles.`,
);
