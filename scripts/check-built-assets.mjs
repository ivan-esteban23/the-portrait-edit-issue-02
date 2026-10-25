import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { JSDOM } from "jsdom";

const base = "/the-portrait-edit-issue-02/";
const site = new URL(`https://ivan-esteban23.github.io${base}`);
const html = readFileSync("dist/index.html", "utf8");
const dom = new JSDOM(html, { url: site.href });
const document = dom.window.document;
const assets = new Set();

function localFile(value) {
  const url = new URL(value, site);
  assert.equal(url.origin, site.origin, `Unexpected asset origin: ${value}`);
  assert.ok(url.pathname.startsWith(base), `Missing project base: ${value}`);
  const file = resolve("dist", decodeURIComponent(url.pathname.slice(base.length)));
  assert.ok(file.startsWith(resolve("dist") + sep), `Unsafe path: ${value}`);
  assert.ok(statSync(file).isFile(), `Missing build asset: ${value}`);
  assets.add(url.href);
}

assert.ok(!html.includes("%BASE_URL%"), "Unresolved Vite base placeholder");
for (const node of document.querySelectorAll("[href], [src]")) {
  for (const attr of ["href", "src"]) {
    const value = node.getAttribute(attr);
    if (value?.startsWith("/")) {
      assert.ok(value.startsWith(base), `Unscoped HTML path: ${value}`);
    }
  }
}
assert.equal(document.querySelector('link[rel="canonical"]')?.href, site.href);
assert.equal(
  document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  `${base}manifest.webmanifest`,
);
assert.equal(
  document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
  `${base}icon-192.png`,
);
for (const node of document.head.querySelectorAll("link[href], script[src], meta[property='og:image'], meta[name='twitter:image']")) {
  if (node.getAttribute("rel") === "canonical") continue;
  localFile(node.getAttribute("href") ?? node.getAttribute("src") ?? node.getAttribute("content"));
}
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.start_url, base);
assert.equal(manifest.scope, base);
assert.equal(manifest.display, "standalone");
for (const size of ["192x192", "512x512"]) {
  assert.ok(manifest.icons.some((icon) => icon.sizes === size && icon.type === "image/png"));
}
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith(base), `Unscoped manifest icon: ${icon.src}`);
  localFile(icon.src);
}
dom.window.close();
console.log(`Built asset check: ${assets.size} head/manifest assets exist; canonical, start_url, scope and all root-relative HTML paths include ${base}`);
