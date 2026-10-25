import { copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import { staticReader } from "./static-reader.mjs";
writeFileSync("dist/.nojekyll", "");
// Known routes also get real index files: direct links receive HTTP 200 on Pages.
const { readFileSync, readdirSync } = await import("node:fs");
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
writeFileSync("dist/manifest.webmanifest", JSON.stringify(manifest, null, 2) + "\n");
const withReader = (issue, page) =>
  template.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/, () =>
    staticReader(issue, base, page),
  );
const routes = ["prompts", "about"];
const pageRoutes = new Map();
let currentIssue;
for (const slug of readdirSync("src/content/issues")) {
  const issue = JSON.parse(
    readFileSync(`src/content/issues/${slug}/issue.json`, "utf8"),
  );
  if (slug === "the-prompt-issue") currentIssue = issue;
  routes.push(`issues/${slug}`);
  pageRoutes.set(`issues/${slug}`, { issue });
  for (let n = 1; n <= issue.pages; n++) {
    const route = `issues/${slug}/pages/${n}`;
    routes.push(route);
    pageRoutes.set(route, { issue, page: n });
  }
}
if (!currentIssue)
  throw new Error("Missing current issue for the static reader");
// Preserve the authored home fallback; nested issue routes get the full static reader.
copyFileSync("dist/index.html", "dist/404.html");
for (const file of readdirSync("src/content/prompts"))
  routes.push(`prompts/${file.slice(0, -5)}`);
for (const route of routes) {
  mkdirSync(`dist/${route}`, { recursive: true });
  const entry = pageRoutes.get(route);
  if (entry)
    writeFileSync(
      `dist/${route}/index.html`,
      withReader(entry.issue, entry.page),
    );
  else copyFileSync("dist/index.html", `dist/${route}/index.html`);
}
console.log(`Generated 404 fallback and ${routes.length} route entrypoints.`);
