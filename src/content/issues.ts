import type { Issue } from "./schema";
export const issues = Object.values(
  import.meta.glob<Issue>("./issues/*/issue.json", {
    eager: true,
    import: "default",
  }),
);
const requiredIssue = issues.find((issue) => issue.slug === "the-prompt-issue");
if (!requiredIssue) {
  throw new Error(
    'Unable to load The Portrait Edit: required issue "the-prompt-issue" is missing from src/content/issues/.',
  );
}
export const currentIssue = requiredIssue;
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const readerPath = (slug: string, page = 1) =>
  `/issues/${slug}/pages/${page}`;
export function chapterAt(issue: typeof currentIssue, page: number) {
  return (
    issue.chapters.find((c) => page >= c.startPage && page <= c.endPage) ?? {
      title: "Front matter",
      startPage: 1,
      endPage: issue.chapters[0].startPage - 1,
    }
  );
}
