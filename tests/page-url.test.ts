import { expect, test } from "vitest";
import { absolutePageUrl, truncateMetaDescription } from "../src/lib/pageMeta";
const base = "https://ivan-esteban23.github.io/the-portrait-edit-issue-02/";
test.each([
  "/",
  "/prompts",
  "/about/",
  "/issues/the-prompt-issue",
  "/issues/the-prompt-issue/pages/1",
  "/prompts/issue-02-study-001/",
  "/prompts?tag=film#study",
])("canonical directory URL: %s", (path) => {
  const result = new URL(absolutePageUrl(path, base));
  expect(result.href.startsWith(base)).toBe(true);
  expect(result.pathname.endsWith("/")).toBe(true);
  expect(result.search).toBe("");
  expect(result.hash).toBe("");
  expect(result.pathname).not.toContain("//");
});
test("keeps external URLs and truncates normalized descriptions", () => {
  expect(absolutePageUrl("https://example.com/file.pdf", base)).toBe(
    "https://example.com/file.pdf",
  );
  expect(truncateMetaDescription("  A\nportrait  ")).toBe("A portrait");
  expect(truncateMetaDescription("A portrait with soft light", 12)).toBe(
    "A portrait…",
  );
});
