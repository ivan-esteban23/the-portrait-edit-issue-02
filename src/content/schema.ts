import { z } from "zod";
// Build-time content validation via scripts/validate-content.ts.
// App modules import only the inferred types to keep Zod out of the runtime bundle.
const text = z.string().min(1);
const asset = text.refine(
  (p) => !p.startsWith("/") && !p.includes("..") && !p.includes(":"),
  "Use a local path relative to docs/",
);
export const chapterSchema = z
  .object({
    title: text,
    startPage: z.number().int().positive(),
    endPage: z.number().int().positive(),
    intro: text.optional(),
    openerNote: text.optional(),
    featuredStudies: z.array(z.number().int().positive()).length(3).optional(),
  })
  .refine((c) => c.endPage >= c.startPage, "Chapter ends before it starts");
export const issueSchema = z.object({
  slug: text.regex(/^[a-z0-9-]+$/),
  number: text,
  title: text,
  description: text,
  cover: asset,
  pageDirectory: asset,
  pdfUrl: z.url(),
  pdfBytes: z.number().positive(),
  pages: z.number().int().positive(),
  studies: z.number().int().nonnegative(),
  otherIssueUrl: z.url(),
  featured: z.array(text),
  chapters: z.array(chapterSchema).min(1),
});
export const promptSchema = z.object({
  id: text.regex(/^[a-z0-9-]+$/),
  issueSlug: text,
  studyNumber: z.number().int().positive(),
  page: z.number().int().positive(),
  title: text,
  referenceImage: asset,
  source: text,
  prompt: text,
  style: text,
  workingNotes: text,
  tryThis: text,
  flags: text,
  parameters: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  model: text.nullable(),
  tags: z.array(text),
  date: z.iso.date().nullable(),
});
export const pageSchema = z.object({ text: z.string() });
export type Issue = z.infer<typeof issueSchema>;
export type Prompt = z.infer<typeof promptSchema>;
