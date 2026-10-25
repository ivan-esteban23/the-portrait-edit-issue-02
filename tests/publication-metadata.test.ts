import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  publicationMetadata,
  studyCount,
} from "../scripts/publication-metadata";

test("social descriptions use the current issue's actual archive count", () => {
  const html = readFileSync("index.html", "utf8");
  const count = studyCount();
  const issue = JSON.parse(
    readFileSync("src/content/issues/the-prompt-issue/issue.json", "utf8"),
  );
  expect(count).toBe(issue.studies);
  const document = new DOMParser().parseFromString(
    publicationMetadata(html),
    "text/html",
  );
  for (const selector of [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    expect(document.querySelector(selector)?.getAttribute("content")).toMatch(
      new RegExp(`^${count} editorial studies\\.`),
    );
  }
  const deployed =
    "https://ivan-esteban23.github.io/the-portrait-edit-issue-02/";
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  ).toBe(deployed);
  expect(
    document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
  ).toBe(deployed);
});

test("the generated count follows new records and excludes other issues", () => {
  const dir = mkdtempSync(join(tmpdir(), "portrait-study-count-"));
  try {
    writeFileSync(
      join(dir, "one.json"),
      JSON.stringify({ issueSlug: "the-prompt-issue" }),
    );
    writeFileSync(
      join(dir, "other.json"),
      JSON.stringify({ issueSlug: "another-issue" }),
    );
    expect(studyCount(dir)).toBe(1);
    writeFileSync(
      join(dir, "two.json"),
      JSON.stringify({ issueSlug: "the-prompt-issue" }),
    );
    expect(
      publicationMetadata("%STUDY_COUNT% editorial studies.", studyCount(dir)),
    ).toBe("2 editorial studies.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
