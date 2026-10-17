import type { Prompt } from "@/content/schema";

export type CopyFormat =
  | "raw"
  | "plain"
  | "params"
  | "midjourney"
  | "discord"
  | "flux"
  | "markdown";

function cleanPromptText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function getParametersString(parameters?: Record<string, string | number | boolean>): string {
  if (!parameters) return "";
  return Object.entries(parameters)
    .map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`} ${v}`)
    .join(" ");
}

export function formatPromptText(prompt: Prompt, format: CopyFormat = "raw"): string {
  if (format === "raw") {
    return prompt.prompt;
  }

  const cleaned = cleanPromptText(prompt.prompt);
  const params = getParametersString(prompt.parameters);

  if (format === "plain") {
    return cleaned;
  }

  if (format === "discord") {
    const combined = params && !cleaned.includes(params) ? `${cleaned} ${params}` : cleaned;
    return `/imagine prompt: ${combined}`;
  }

  if (format === "midjourney" || format === "params") {
    if (!params) return cleaned;
    if (cleaned.includes(params)) return cleaned;
    return `${cleaned} ${params}`;
  }

  if (format === "flux") {
    // FLUX works best with natural language; strip Midjourney parameter flags (--ar, --v, --s, --c, etc.)
    const fluxText = cleaned
      .replace(/\s*--(?:v|version|s|stylize|c|chaos|style|quality|q|iw|no|stop|repeat|seed|weird|w)\s+[^\s]+/gi, "")
      .replace(/\s*--[a-z0-9_-]+/gi, "")
      .trim();
    return fluxText;
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
