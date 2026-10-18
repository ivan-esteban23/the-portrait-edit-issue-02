import type { Prompt } from "@/content/schema";

export type CopyFormat =
  "raw" | "plain" | "params" | "midjourney" | "discord" | "flux" | "markdown";

function cleanPromptText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export interface CommandParameter {
  key: string;
  value: string;
}
const aliases: Record<string, string> = {
  aspect: "ar",
  version: "v",
  stylize: "s",
  chaos: "c",
  quality: "q",
  weird: "w",
};
const parameterKey = (key: string) => {
  const normalized = key.replace(/^--/, "").toLowerCase();
  return aliases[normalized] || normalized;
};

// Midjourney flags form a trailing suffix; values such as --no may contain words.
export function splitPromptParameters(text: string) {
  const matches = [...text.matchAll(/(?:^|\s)--([a-z][a-z0-9_-]*)(?=\s|$)/gi)];
  const parameters = new Map<string, string>();
  matches.forEach((match, index) => {
    const value = text
      .slice(
        match.index! + match[0].length,
        matches[index + 1]?.index ?? text.length,
      )
      .trim();
    parameters.set(parameterKey(match[1]), value);
  });
  return {
    text: (matches.length ? text.slice(0, matches[0].index) : text).trim(),
    parameters,
  };
}

export function getCommandParameters(
  prompt: Pick<Prompt, "prompt" | "parameters">,
): CommandParameter[] {
  const { parameters } = splitPromptParameters(prompt.prompt);
  Object.entries(prompt.parameters || {}).forEach(([key, value]) => {
    const normalized = parameterKey(key);
    if (value === false) parameters.delete(normalized);
    else parameters.set(normalized, value === true ? "" : String(value));
  });
  return Array.from(parameters, ([key, value]) => ({ key, value }));
}

export function formatCommand(
  text: string,
  parameters: readonly CommandParameter[],
  enabled?: readonly string[],
) {
  const selected = enabled ? new Set(enabled.map(parameterKey)) : null;
  const flags = parameters
    .filter(({ key }) => !selected || selected.has(key))
    .map(({ key, value }) => `--${key}${value ? ` ${value}` : ""}`)
    .join(" ");
  return [cleanPromptText(splitPromptParameters(text).text), flags]
    .filter(Boolean)
    .join(" ");
}

export function formatPromptText(
  prompt: Prompt,
  format: CopyFormat = "raw",
  enabledParameters?: readonly string[],
): string {
  if (format === "raw") {
    return prompt.prompt;
  }

  const cleaned = cleanPromptText(prompt.prompt);
  const command = () =>
    formatCommand(
      prompt.prompt,
      getCommandParameters(prompt),
      enabledParameters,
    );

  if (format === "plain") {
    return cleaned;
  }

  if (format === "discord") {
    return `/imagine prompt: ${command()}`;
  }

  if (format === "midjourney" || format === "params") return command();

  if (format === "flux") {
    return cleanPromptText(splitPromptParameters(prompt.prompt).text);
  }

  if (format === "markdown") {
    const tags = prompt.tags.map((t) => `#${t}`).join(" ");
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ivan-esteban23.github.io";
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
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export async function sharePrompt(
  prompt: Prompt,
  pathUrl?: string,
): Promise<boolean> {
  if (!canShare()) return false;
  try {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ivan-esteban23.github.io";
    const shareUrl = pathUrl
      ? `${baseUrl}${pathUrl}`
      : `${baseUrl}/the-portrait-edit-issue-02/prompts/${prompt.id}`;

    await navigator.share({
      title: `${prompt.title} — The Portrait Edit`,
      text:
        prompt.prompt.length > 140
          ? `${prompt.prompt.slice(0, 140)}…`
          : prompt.prompt,
      url: shareUrl,
    });
    return true;
  } catch {
    return false;
  }
}
