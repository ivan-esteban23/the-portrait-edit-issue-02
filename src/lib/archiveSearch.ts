import type { Prompt } from "@/content/schema";
import { editorialSelections } from "@/content/editorialSelections";
import { splitPromptParameters } from "./promptFormatter";

export const normalizeSearch = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export const searchTerms = (query: string) =>
  [...normalizeSearch(query).matchAll(/"([^"]+)"|(\S+)/g)].map(
    (match) => match[1] || match[2],
  );

export function matchesArchiveSearch(prompt: Prompt, query: string): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  if (normalized.startsWith("#"))
    return prompt.tags.some(
      (tag) => normalizeSearch(tag) === normalized.slice(1).trim(),
    );
  const number = normalized.match(/^(?:study\s*#?\s*)?0*(\d+)$/);
  if (number) return prompt.studyNumber === Number(number[1]);
  const text = normalizeSearch(
    `${prompt.title} ${prompt.prompt} ${prompt.style} ${prompt.studyNumber} ${prompt.id} ${prompt.tags.join(" ")}`,
  );
  return searchTerms(normalized).every((term) => text.includes(term));
}

export function matchesArchiveScope(
  prompt: Prompt,
  params: URLSearchParams,
  isSaved: (id: string) => boolean,
  parsedRatio?: string,
) {
  const selection = editorialSelections.find(
    (selection) => selection.id === params.get("selection"),
  );
  if (selection && !selection.numbers.includes(prompt.studyNumber))
    return false;
  const tag = params.get("tag"),
    model = params.get("model"),
    ratio = params.get("ar");
  if (tag && !prompt.tags.includes(tag)) return false;
  if (params.get("saved") === "1" && !isSaved(prompt.id)) return false;
  if (
    model &&
    (prompt.model?.trim() && prompt.model.trim() !== "Unspecified"
      ? prompt.model.trim()
      : "Unspecified") !== model
  )
    return false;
  if (ratio) {
    const value =
      prompt.parameters?.ar ||
      prompt.parameters?.["--ar"] ||
      parsedRatio ||
      splitPromptParameters(prompt.prompt).parameters.get("ar");
    const recorded =
      value && String(value).trim() !== "Unspecified"
        ? String(value).trim()
        : "none";
    if (recorded !== ratio) return false;
  }
  return true;
}

export const searchTopics = [
  {
    title: "Lighting",
    items: [
      ["Soft light", "soft light"],
      ["Low-key studio", "low-key studio"],
      ["Golden hour", "golden hour"],
    ],
  },
  {
    title: "Mood",
    items: [
      ["Moody", "moody"],
      ["Quiet", "quiet"],
      ["Playful", "playful"],
    ],
  },
  {
    title: "Styling",
    items: [
      ["Monochrome", "monochrome"],
      ["Vintage", "vintage"],
      ["Streetwear", "street"],
    ],
  },
];

export function rankSearchResults(
  candidates: readonly Prompt[],
  query: string,
) {
  const normalized = normalizeSearch(query);
  const score = (prompt: Prompt) => {
    if (!normalized) return [4, 16, 5].includes(prompt.studyNumber) ? 100 : 0;
    const title = normalizeSearch(prompt.title),
      tags = prompt.tags.map(normalizeSearch);
    return (
      (title === normalized ? 500 : 0) +
      (title.startsWith(normalized) ? 100 : 0) +
      searchTerms(normalized).reduce(
        (total, term) =>
          total + (title.includes(term) ? 50 : tags.includes(term) ? 30 : 1),
        0,
      )
    );
  };
  return candidates
    .filter((prompt) => matchesArchiveSearch(prompt, query))
    .sort((a, b) => score(b) - score(a) || a.studyNumber - b.studyNumber);
}

export function searchExcerpt(prompt: Prompt, query: string) {
  if (!query.trim()) return prompt.style;
  const index = searchTerms(query.trim().replace(/^#/, ""))
    .map((term) => prompt.prompt.toLowerCase().indexOf(term))
    .find((index) => index >= 0);
  if (index === undefined) return prompt.style + " · " + prompt.tags.join(", ");
  const start = Math.max(0, index - 38),
    end = Math.min(prompt.prompt.length, start + 145);
  return (
    (start ? "…" : "") +
    prompt.prompt.slice(start, end) +
    (end < prompt.prompt.length ? "…" : "")
  );
}
