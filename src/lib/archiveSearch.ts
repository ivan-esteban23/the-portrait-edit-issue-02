import type { Prompt } from "@/content/schema";

export function matchesArchiveSearch(prompt: Prompt, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("#")) {
    const tag = normalized.slice(1).trim();
    return prompt.tags.some((value) => value.toLowerCase() === tag);
  }
  return `${prompt.title} ${prompt.prompt} ${prompt.style} ${prompt.studyNumber} ${prompt.tags.join(" ")}`
    .toLowerCase()
    .includes(normalized);
}
