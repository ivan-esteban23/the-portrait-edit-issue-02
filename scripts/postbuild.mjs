import { copyFileSync, writeFileSync, mkdirSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
writeFileSync("dist/.nojekyll", "");
// Known routes also get real index files: direct links receive HTTP 200 on Pages.
const { readFileSync, readdirSync } = await import("node:fs");
const routes = ["prompts", "about"];
for (const slug of readdirSync("src/content/issues")) {
  const issue = JSON.parse(
    readFileSync(`src/content/issues/${slug}/issue.json`, "utf8"),
  );
  routes.push(`issues/${slug}`);
  for (let n = 1; n <= issue.pages; n++)
    routes.push(`issues/${slug}/pages/${n}`);
}
for (const file of readdirSync("src/content/prompts"))
  routes.push(`prompts/${file.slice(0, -5)}`);
for (const route of routes) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync("dist/index.html", `dist/${route}/index.html`);
}
console.log(`Generated 404 fallback and ${routes.length} route entrypoints.`);
