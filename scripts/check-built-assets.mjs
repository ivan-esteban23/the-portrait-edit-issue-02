import assert from "node:assert/strict";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import { JSDOM } from "jsdom";

import sharp from "sharp";

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
  const file = resolve(
    "dist",
    decodeURIComponent(url.pathname.slice(base.length)),
  );
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
for (const node of document.head.querySelectorAll(
  "link[href], script[src], meta[property='og:image'], meta[name='twitter:image']",
)) {
  if (node.getAttribute("rel") === "canonical") continue;
  localFile(
    node.getAttribute("href") ??
      node.getAttribute("src") ??
      node.getAttribute("content"),
  );
}
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.start_url, base);
assert.equal(manifest.scope, base);
assert.equal(manifest.display, "standalone");
for (const size of ["192x192", "512x512"]) {
  assert.ok(
    manifest.icons.some(
      (icon) => icon.sizes === size && icon.type === "image/png",
    ),
  );
}
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith(base), `Unscoped manifest icon: ${icon.src}`);
  localFile(icon.src);
}
dom.window.close();
console.log(
  `Built asset check: ${assets.size} head/manifest assets exist; canonical, start_url, scope and all root-relative HTML paths include ${base}`,
);
const titles = new Set();
const canonicals = new Set();
for (const file of readdirSync("dist", { recursive: true }).filter(
  (f) => f === "index.html" || f.endsWith("/index.html"),
)) {
  const source = readFileSync(`dist/${file}`, "utf8");
  assert.ok(!source.includes("%BASE_URL%"), `${file}: unresolved base`);
  const page = new JSDOM(source, { url: site.href });
  const doc = page.window.document;
  const route =
    file === "index.html" ? "" : file.slice(0, -"index.html".length);
  const canonical = new URL(route, site).href;
  assert.equal(
    doc.querySelector('link[rel="canonical"]').href,
    canonical,
    file,
  );
  assert.equal(
    doc.querySelector('meta[property="og:url"]').content,
    canonical,
    file,
  );
  assert.ok(!titles.has(doc.title), `${file}: duplicate title`);
  titles.add(doc.title);
  canonicals.add(canonical);
  const description = doc.querySelector('meta[name="description"]').content;
  const image = doc.querySelector('meta[property="og:image"]').content;
  for (const [key, value] of Object.entries({
    title: doc.title,
    description,
    image,
  })) {
    assert.equal(
      doc.querySelector(`meta[property="og:${key}"]`).content,
      value,
      file,
    );
    assert.equal(
      doc.querySelector(`meta[name="twitter:${key}"]`).content,
      value,
      file,
    );
  }
  const structured = JSON.parse(
    doc.querySelector('script[type="application/ld+json"]').textContent,
  );
  for (const [key, value] of Object.entries({
    url: canonical,
    name: doc.title,
    description,
    image,
  }))
    assert.equal(structured[key], value, file);
  assert.ok(
    doc.querySelector("noscript main h1"),
    `${file}: missing static content`,
  );
  assert.equal(doc.querySelectorAll('link[rel="icon"]').length, 2, file);
  const imageSize = await sharp(
    resolve("dist", new URL(image).pathname.slice(base.length)),
  ).metadata();
  assert.equal(
    doc.querySelector('meta[property="og:image:width"]').content,
    String(imageSize.width),
  );
  assert.equal(
    doc.querySelector('meta[property="og:image:height"]').content,
    String(imageSize.height),
  );
  for (const node of doc.head.querySelectorAll(
    'link[href], script[src], meta[property="og:image"], meta[name="twitter:image"]',
  )) {
    if (node.rel !== "canonical")
      localFile(
        node.getAttribute("href") ?? node.getAttribute("src") ?? node.content,
      );
  }
  for (const node of doc.querySelectorAll("[href], [src]"))
    for (const attr of ["href", "src"]) {
      const value = node.getAttribute(attr);
      if (value?.startsWith("/"))
        assert.ok(value.startsWith(base), `${file}: unscoped URL ${value}`);
    }
  page.window.close();
}
const sitemap = new JSDOM(readFileSync("dist/sitemap.xml", "utf8"), {
  contentType: "text/xml",
});
const locations = [...sitemap.window.document.querySelectorAll("loc")].map(
  (n) => n.textContent,
);
assert.deepEqual(
  new Set(locations),
  canonicals,
  "Sitemap must match every indexable canonical",
);
assert.equal(locations.length, canonicals.size, "Duplicate sitemap URLs");
sitemap.window.close();
const card = await sharp("dist/social-card.png").metadata();
assert.equal(card.width, 1200);
assert.equal(card.height, 630);
assert.ok(!readFileSync("dist/404.html", "utf8").includes("%BASE_URL%"));
console.log(
  `Validated ${titles.size} unique route heads, canonicals, JSON-LD, image dimensions, favicons and sitemap URLs.`,
);
