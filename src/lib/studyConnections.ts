import type { Issue, Prompt } from "@/content/schema";
import { getRelatedStudies } from "./relatedStudies";

export interface StudyConnection {
  target: Prompt;
  dimension: string;
  title: string;
  reason: string;
  source: string;
  destination: string;
  basis: string;
}

type GuidedConnection = Omit<StudyConnection, "target" | "basis"> & {
  number: number;
};
const guidedConnections: Record<string, GuidedConnection[]> = {
  "issue-02-study-004": [
    {
      number: 13,
      dimension: "Frame",
      title: "Keep the contrast. Widen the frame.",
      reason:
        "Both prompts use soft, even studio lighting and a plain backdrop. Move from the mid-torso portrait to a full-body composition, where the black-and-white clothing carries the graphic contrast.",
      source: "cropped from mid-torso up",
      destination: "full-body studio fashion portrait",
    },
    {
      number: 14,
      dimension: "Color",
      title: "Keep the graphic shapes. Add color.",
      reason:
        "Both studies are tagged graphic. The neutral grays and black of the starting portrait give way to a red headband, pink backdrop, and a warmer palette.",
      source: "soft grays, white, and deep black",
      destination: "cherry red, blush pink, and cream white",
    },
    {
      number: 27,
      dimension: "Light",
      title: "Keep the gray backdrop. Sharpen the light.",
      reason:
        "Both prompts describe a gray seamless backdrop and a graphic portrait. Compare the soft, even lighting of the starting image with the high contrast and sharp jaw shadows in this study.",
      source: "Soft, even studio lighting",
      destination: "high-contrast studio lighting",
    },
  ],
};

function excerpt(prompt: Prompt) {
  const sentence =
    prompt.prompt.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || prompt.prompt;
  if (sentence.length <= 280) return sentence;
  const cut = sentence.lastIndexOf(" ", 270);
  return sentence.slice(0, cut > 0 ? cut : 270) + "…";
}

export function getStudyConnections(
  current: Prompt,
  candidates: readonly Prompt[],
  issue: Issue,
  excluded = "",
): StudyConnection[] {
  const available = candidates.filter(
    (p) =>
      p.id !== current.id &&
      p.id !== excluded &&
      p.issueSlug === current.issueSlug,
  );
  const curated = guidedConnections[current.id]?.flatMap((connection) => {
    const target = available.find((p) => p.studyNumber === connection.number);
    return target
      ? [{ ...connection, target, basis: "Prompt comparison" }]
      : [];
  });
  if (curated?.length) return curated;
  const tags = new Set(current.tags.map((tag) => tag.trim().toLowerCase()));
  const related = getRelatedStudies(current, available, 3);
  if (related.length)
    return related.map((target) => {
      const shared = [
        ...new Set(target.tags.map((tag) => tag.trim().toLowerCase())),
      ].filter((tag) => tags.has(tag));
      return {
        target,
        dimension: "Style",
        title: `Follow the ${shared[0]} direction.`,
        reason: `Both studies are tagged ${shared.join(" and ")}. Read both prompts to compare their framing, setting, and details.`,
        source: excerpt(current),
        destination: excerpt(target),
        basis: "Shared tags: " + shared.join(", "),
      };
    });
  const chapter =
    issue.slug === current.issueSlug
      ? issue.chapters.find(
          (c) => current.page >= c.startPage && current.page <= c.endPage,
        )
      : undefined;
  return available
    .filter(
      (p) =>
        !chapter || (p.page >= chapter.startPage && p.page <= chapter.endPage),
    )
    .sort(
      (a, b) =>
        Math.abs(a.page - current.page) - Math.abs(b.page - current.page) ||
        a.studyNumber - b.studyNumber,
    )
    .slice(0, 3)
    .map((target) => ({
      target,
      dimension: "Chapter",
      title: chapter
        ? `Another view of ${chapter.title.toLowerCase()}.`
        : "Another study from the issue.",
      reason: chapter
        ? `These studies appear in the published ${chapter.title} chapter. Read their original prompts together to find a connection of your own.`
        : "These studies appear in the same issue. Read their original prompts together to find a connection of your own.",
      source: excerpt(current),
      destination: excerpt(target),
      basis: chapter ? "Same chapter: " + chapter.title : "Same issue",
    }));
}
