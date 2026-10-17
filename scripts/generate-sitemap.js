import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const BASE_URL = "https://ivan-esteban23.github.io/the-portrait-edit-issue-02";
const today = new Date().toISOString().slice(0, 10);

const routes = [
  { path: "", priority: "1.0", changefreq: "weekly" },
  { path: "about", priority: "0.8", changefreq: "monthly" },
  { path: "prompts", priority: "0.9", changefreq: "weekly" },
];

// Add issues & reader pages
const issueSlugs = readdirSync("src/content/issues");
for (const slug of issueSlugs) {
  const issueData = JSON.parse(
    readFileSync(`src/content/issues/${slug}/issue.json`, "utf8"),
  );
  routes.push({ path: `issues/${slug}`, priority: "0.8", changefreq: "monthly" });
  for (let n = 1; n <= issueData.pages; n++) {
    routes.push({
      path: `issues/${slug}/pages/${n}`,
      priority: n === 1 ? "0.8" : "0.6",
      changefreq: "monthly",
    });
  }
}

// Add prompt study pages
const promptFiles = readdirSync("src/content/prompts");
for (const file of promptFiles) {
  if (file.endsWith(".json")) {
    routes.push({
      path: `prompts/${file.slice(0, -5)}`,
      priority: "0.7",
      changefreq: "monthly",
    });
  }
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${BASE_URL}/${r.path ? `${r.path}` : ""}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

const targetDirs = ["public", "docs"];
if (existsSync("dist")) {
  targetDirs.push("dist");
}

for (const dir of targetDirs) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/sitemap.xml`, sitemapXml, "utf8");
  writeFileSync(`${dir}/robots.txt`, robotsTxt, "utf8");
}

console.log(`Generated sitemap.xml (${routes.length} URLs) and robots.txt in: ${targetDirs.join(", ")}`);
