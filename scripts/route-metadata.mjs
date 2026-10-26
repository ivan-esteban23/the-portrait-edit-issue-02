import { readFileSync, readdirSync } from "node:fs";
import { truncateMetaDescription } from "../src/lib/pageMeta.ts";
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
export const issues = readdirSync("src/content/issues").map((slug) =>
  read(`src/content/issues/${slug}/issue.json`),
);
export const studies = readdirSync("src/content/prompts")
  .filter((f) => f.endsWith(".json"))
  .map((f) => read(`src/content/prompts/${f}`))
  .sort((a, b) => a.studyNumber - b.studyNumber);
const current = issues.find((i) => i.slug === "the-prompt-issue");
const card = "social-card.png";
export const routeMetadata = new Map([
  [
    "",
    {
      title: "The Portrait Edit — Issue 02",
      description: current.description,
      image: card,
    },
  ],
  [
    "about",
    {
      title: "About | The Portrait Edit",
      description:
        "About The Portrait Edit — an editorial magazine exploring AI-generated portrait photography",
      image: card,
    },
  ],
  [
    "prompts",
    {
      title: `Prompt Archive (${studies.length} Studies) | The Portrait Edit`,
      description: `Browse and filter all ${studies.length} portrait studies in The Portrait Edit Issue 02`,
      image: card,
    },
  ],
]);
for (const issue of issues) {
  routeMetadata.set(`issues/${issue.slug}`, {
    title: `Issue ${issue.number} — ${issue.title} | The Portrait Edit`,
    description: issue.description,
    image: card,
    issue,
  });
  for (let page = 1; page <= issue.pages; page++) {
    const chapter = issue.chapters.find(
      (c) => page >= c.startPage && page <= c.endPage,
    );
    const study = studies.find(
      (s) => s.issueSlug === issue.slug && s.page === page,
    );
    routeMetadata.set(`issues/${issue.slug}/pages/${page}`, {
      title: `Page ${page} — ${chapter?.title ?? "Front matter"} | The Portrait Edit`,
      description: study
        ? truncateMetaDescription(study.prompt)
        : issue.description,
      image: study?.referenceImage ?? card,
      issue,
      page,
    });
  }
}
for (const study of studies)
  routeMetadata.set(`prompts/${study.id}`, {
    title: `Study #${study.studyNumber}: ${study.title} | The Portrait Edit`,
    description: truncateMetaDescription(study.prompt),
    image: study.referenceImage,
    study,
    issue: issues.find((i) => i.slug === study.issueSlug),
  });
