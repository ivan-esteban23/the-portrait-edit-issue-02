import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function studyCount(
  directory = "src/content/prompts",
  slug = "the-prompt-issue",
) {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(resolve(directory, file), "utf8")))
    .filter((study) => study.issueSlug === slug).length;
}

export function publicationMetadata(html: string, count = studyCount()) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("Missing publication studies");
  return html.replaceAll("%STUDY_COUNT%", String(count));
}
