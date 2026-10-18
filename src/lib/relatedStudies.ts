import type { Prompt } from "@/content/schema";

export function getRelatedStudies(
  current: Prompt,
  candidates: readonly Prompt[],
  limit = 4,
): Prompt[] {
  const tags = new Set(current.tags.map((tag) => tag.trim().toLowerCase()));
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((prompt) => ({
      prompt,
      score: [
        ...new Set(prompt.tags.map((tag) => tag.trim().toLowerCase())),
      ].filter((tag) => tags.has(tag)).length,
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.prompt.studyNumber - b.prompt.studyNumber ||
        a.prompt.id.localeCompare(b.prompt.id),
    )
    .slice(0, Math.max(0, limit))
    .map((item) => item.prompt);
}
