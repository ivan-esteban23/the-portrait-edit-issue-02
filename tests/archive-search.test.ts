import { describe, expect, it } from "vitest";
import { prompts } from "../src/content";
import { matchesArchiveSearch } from "../src/lib/archiveSearch";
import { readArchiveContext } from "../src/lib/archiveNavigation";

describe("archive search", () => {
  const study = {
    ...prompts[0],
    title: "Portrait",
    prompt: "Soft window light",
    style: "Quiet",
    tags: ["moody", "dark romantic"],
  };

  it("ignores case and surrounding whitespace without losing ordinary text matching", () => {
    for (const query of [
      "portrait",
      " PORTRAIT ",
      "  window light  ",
      "",
      "   ",
      String(study.studyNumber),
    ]) {
      expect(matchesArchiveSearch(study, query), query).toBe(true);
    }
    expect(matchesArchiveSearch(study, "no match")).toBe(false);
  });

  it("searches actual tag values even when absent from title, style, and prompt", () => {
    expect(matchesArchiveSearch(study, "romantic")).toBe(true);
  });

  it("matches hashtags as complete, case-insensitive tags, including multiword tags", () => {
    for (const query of [
      "#moody",
      "  #MOODY  ",
      "#dark romantic",
      "# dark romantic ",
    ]) {
      expect(matchesArchiveSearch(study, query), query).toBe(true);
    }
    for (const query of ["#mood", "#romantic", "#unknown", "#"]) {
      expect(matchesArchiveSearch(study, query), query).toBe(false);
    }
  });

  it("returns the same real records for a hashtag and its exact tag filter", () => {
    expect(
      prompts.filter((p) => matchesArchiveSearch(p, "#moody")).map((p) => p.id),
    ).toEqual(prompts.filter((p) => p.tags.includes("moody")).map((p) => p.id));
  });
});

describe("archive navigation state", () => {
  const context = {
    search: "?tag=moody&saved=1",
    scrollY: 420,
    studyId: "issue-02-study-001",
    tagsExpanded: true,
  };
  it("retains a valid archive snapshot", () => {
    expect(readArchiveContext(context)).toEqual(context);
  });
  it("rejects arbitrary destinations and invalid coordinates", () => {
    for (const value of [
      null,
      {},
      "https://example.com",
      { ...context, search: "//example.com" },
      { ...context, scrollY: -1 },
      { ...context, scrollY: Infinity },
      { ...context, tagsExpanded: "yes" },
    ]) {
      expect(readArchiveContext(value)).toBeNull();
    }
  });
});
