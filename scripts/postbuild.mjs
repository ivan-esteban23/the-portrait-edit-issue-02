import { copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import { absolutePageUrl, pageStructuredData } from "../src/lib/pageMeta.ts";
import { routeMetadata, studies } from "./route-metadata.mjs";
import { staticStudy } from "./static-study.mjs";
import { escapeHtml, staticReader } from "./static-reader.mjs";
writeFileSync("dist/.nojekyll", "");
// Known routes also get real index files: direct links receive HTTP 200 on Pages.
const { readFileSync } = await import("node:fs");
const template = readFileSync("dist/index.html", "utf8");
const base = template.match(/href="([^"]*)manifest\.webmanifest"/)?.[1];
if (!base) throw new Error("Cannot find the built site's base URL");
// Materialize manifest URLs from the same Vite base used by the head assets.
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
const site = new URL(base, "https://build.invalid");
const scopedPath = (value) => new URL(value, site).pathname;
manifest.start_url = scopedPath(manifest.start_url);
manifest.scope = scopedPath(manifest.scope);
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: scopedPath(icon.src),
}));
writeFileSync(
  "dist/manifest.webmanifest",
  JSON.stringify(manifest, null, 2) + "\n",
);
// Compose a landscape issue card from the existing cover and editorial type.
const cardSvg =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#121212"/><path d="M70 78H755" stroke="#a98d64"/>
  <g fill="#f3eee5" font-family="Georgia, serif">
    <text x="70" y="175" font-size="30">THE PORTRAIT EDIT / ISSUE 02</text>
    <text x="66" y="295" font-size="78">The Prompt</text><text x="66" y="380" font-size="78">Issue</text>
    <text x="70" y="480" font-size="26">${studies.length} studies · Prompts · References</text>
    <text x="70" y="525" font-size="24">An independent editorial magazine</text>
  </g></svg>`);
const cover = await sharp("dist/cover.webp").resize(340, 440).png().toBuffer();
await sharp(cardSvg)
  .composite([{ input: cover, left: 810, top: 95 }])
  .png()
  .toFile("dist/social-card.png");
const siteUrl = new URL(base, "https://ivan-esteban23.github.io").href;
for (const [route, meta] of routeMetadata) {
  const url = absolutePageUrl(route, siteUrl);
  const image = new URL(meta.image, siteUrl).href;
  const { window } = new JSDOM(template);
  const doc = window.document;
  doc.title = meta.title;
  const setMeta = (attr, name, value) => {
    let node = doc.querySelector(`meta[${attr}="${name}"]`);
    if (!node) {
      node = doc.createElement("meta");
      node.setAttribute(attr, name);
      doc.head.append(node);
    }
    node.content = value;
  };
  setMeta("name", "description", meta.description);
  doc.querySelector('link[rel="canonical"]').href = url;
  for (const [key, value] of Object.entries({
    title: meta.title,
    description: meta.description,
    url,
    image,
  }))
    setMeta("property", `og:${key}`, value);
  for (const [key, value] of Object.entries({
    title: meta.title,
    description: meta.description,
    image,
  }))
    setMeta("name", `twitter:${key}`, value);
  const dimensions = await sharp(`dist/${meta.image}`).metadata();
  setMeta("property", "og:image:width", String(dimensions.width));
  setMeta("property", "og:image:height", String(dimensions.height));
  const jsonLd = doc.createElement("script");
  jsonLd.type = "application/ld+json";
  jsonLd.textContent = JSON.stringify(
    pageStructuredData(meta.title, meta.description, url, image),
  ).replaceAll("<", "\\u003c");
  doc.head.append(jsonLd);
  let fallback;
  if (meta.study) fallback = staticStudy(meta.study, meta.issue, studies, base);
  else if (meta.issue) fallback = staticReader(meta.issue, base, meta.page);
  else if (route === "prompts")
    fallback = `<noscript><main class="noscript-main"><h1>${meta.title}</h1><p>${meta.description}</p><ul>${studies.map((s) => `<li><a href="${base}prompts/${s.id}/">Study #${s.studyNumber}: ${escapeHtml(s.title)}</a></li>`).join("")}</ul></main></noscript>`;
  else if (route === "about")
    fallback = `<noscript><main class="noscript-main"><h1>${meta.title}</h1><p>${meta.description}</p><p>The Portrait Edit is an independent editorial magazine and working archive of AI portrait prompts. Each study preserves its published prompt, reference, and notes.</p><a href="${base}prompts/">Explore the prompt archive</a></main></noscript>`;
  if (fallback) doc.querySelector("noscript").outerHTML = fallback;
  mkdirSync(`dist/${route}`, { recursive: true });
  writeFileSync(
    `dist/${route ? route + "/" : ""}index.html`,
    "<!doctype html>\n" + doc.documentElement.outerHTML,
  );
  window.close();
}
copyFileSync("dist/index.html", "dist/404.html");
console.log(
  `Generated 404 fallback and ${routeMetadata.size} route documents with static metadata.`,
);
