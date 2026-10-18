import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";

/**
 * Generates an editorial Markdown dossier from a list of selected prompts.
 */
export function generateMarkdownDossier(
  selectedPrompts: Prompt[],
  dateStr?: string,
): string {
  const date =
    dateStr ??
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const count = selectedPrompts.length;
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ivan-esteban23.github.io";

  const lines: string[] = [
    "---",
    "title: The Portrait Edit — Curated Dossier",
    `date: "${date}"`,
    `count: ${count}`,
    "collection: Editorial Selection",
    "---",
    "",
    `# The Portrait Edit — Curated Study Dossier`,
    `*Generated on ${date} · ${count} ${count === 1 ? "study" : "studies"} selected*`,
    "",
    "---",
    "",
  ];

  selectedPrompts.forEach((p) => {
    const studyNum = String(p.studyNumber).padStart(3, "0");
    const linkUrl = `${baseUrl}/the-portrait-edit-issue-02/prompts/${p.id}`;

    lines.push(`## Study #${studyNum}: ${p.title}`);
    lines.push("");
    lines.push(`![${p.title}](${assetUrl(p.referenceImage)})`);
    lines.push("");
    lines.push(`> ${p.prompt}`);
    lines.push("");
    lines.push("### Specifications");
    lines.push(`- **Model**: ${p.model || "Midjourney"}`);
    lines.push(`- **Page**: ${p.page} (Issue ${p.issueSlug})`);
    lines.push(
      `- **Tags**: ${p.tags.map((t) => `#${t}`).join(" ") || "None"}`,
    );

    const params = Object.entries(p.parameters || {});
    if (params.length > 0) {
      lines.push("- **Parameters**:");
      params.forEach(([k, v]) => {
        const flag = k.startsWith("--") ? k : `--${k}`;
        lines.push(`  - \`${flag}\`: ${v}`);
      });
    }

    lines.push("");
    lines.push(`[View in Prompt Archive ↗](${linkUrl})`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Triggers a browser download of text content as a file.
 */
export function downloadFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
