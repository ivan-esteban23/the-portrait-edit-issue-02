import type { Prompt } from "@/content/schema";

export type CopyFormat = "raw" | "params" | "markdown";

export function formatPromptText(prompt: Prompt, format: CopyFormat = "raw"): string {
  if (format === "raw") {
    return prompt.prompt;
  }

  if (format === "params") {
    const raw = prompt.prompt.trim();
    const params = Object.entries(prompt.parameters || {})
      .map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`} ${v}`)
      .join(" ");

    if (!params) return raw;
    // Don't duplicate if already present in prompt string
    if (raw.includes(params)) return raw;
    return `${raw} ${params}`;
  }

  if (format === "markdown") {
    const tags = prompt.tags.map((t) => `#${t}`).join(" ");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ivan-esteban23.github.io";
    const refLink = `${baseUrl}/the-portrait-edit-issue-02/prompts/${prompt.id}`;

    return [
      `### ${prompt.title}`,
      `> ${prompt.prompt}`,
      ``,
      `**Study**: #${prompt.studyNumber} (Page ${prompt.page})  `,
      `**Model**: ${prompt.model || "Midjourney"}  `,
      `**Tags**: ${tags || "none"}  `,
      `**Reference**: [View Study](${refLink})`,
    ].join("\n");
  }

  return prompt.prompt;
}

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function sharePrompt(prompt: Prompt, pathUrl?: string): Promise<boolean> {
  if (!canShare()) return false;
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ivan-esteban23.github.io";
    const shareUrl = pathUrl
      ? `${baseUrl}${pathUrl}`
      : `${baseUrl}/the-portrait-edit-issue-02/prompts/${prompt.id}`;

    await navigator.share({
      title: `${prompt.title} — The Portrait Edit`,
      text: prompt.prompt.length > 140 ? `${prompt.prompt.slice(0, 140)}…` : prompt.prompt,
      url: shareUrl,
    });
    return true;
  } catch {
    return false;
  }
}
