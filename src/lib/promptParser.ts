import { splitPromptParameters } from "@/lib/promptFormatter";

export interface PromptTokenCategory {
  label: string;
  colorClass: string;
  tokens: string[];
}

export interface ParsedPrompt {
  raw: string;
  categories: PromptTokenCategory[];
  parameters: Record<string, string>;
}

const CATEGORY_DEFS = [
  { label: "Subject / Figure", colorClass: "anatomy-subject" },
  { label: "Lighting & Tone", colorClass: "anatomy-lighting" },
  { label: "Optics & Camera", colorClass: "anatomy-optics" },
  { label: "Palette & Medium", colorClass: "anatomy-medium" },
  { label: "Mood", colorClass: "anatomy-mood" },
  { label: "General / Atmosphere", colorClass: "anatomy-general" },
] as const;
const CATEGORY_MATCHERS = [
  /\b(light(?:ing)?|shadow|rim|golden hour|tungsten|volumetric|neon|chiaroscuro|rembrandt|softbox|backlit)\b/i,
  /\b(?:\d+\s?mm|lens|f\s?\/|macro|bokeh|angle|shot|anamorphic|camera|telephoto|wide[- ]angle|depth of field)\b/i,
  /\b(kodak|35mm|film|grain|monochrome|oil|pastel|editorial|portra|cinestill|watercolor|watercolour|collage|medium format)\b/i,
  /\b(serene|melancholic|melancholy|ethereal|dreamy|nostalgic|contemplative|dramatic|wistful|mysterious|romantic|intimate)\b/i,
];

/** Split a prompt into editorial clauses and separate trailing `--flag value` parameters. */
export function parsePromptTokens(prompt: string): ParsedPrompt {
  const { text, parameters } = splitPromptParameters(prompt);
  const categories = CATEGORY_DEFS.map(({ label, colorClass }) => ({
    label,
    colorClass,
    tokens: [] as string[],
  }));
  const clauses = text
    .split(/[,;\n]+/)
    .map((clause) =>
      clause
        .trim()
        .replace(/^[.!?]+|[.!?]+$/g, "")
        .trim(),
    )
    .filter(Boolean);

  clauses.forEach((clause, index) => {
    const matchIndex = CATEGORY_MATCHERS.findIndex((pattern) =>
      pattern.test(clause),
    );
    const categoryIndex =
      index === 0 ? 0 : matchIndex >= 0 ? matchIndex + 1 : 5;
    categories[categoryIndex].tokens.push(clause);
  });

  return {
    raw: prompt,
    categories: categories.filter((category) => category.tokens.length > 0),
    parameters: Object.fromEntries(parameters),
  };
}
