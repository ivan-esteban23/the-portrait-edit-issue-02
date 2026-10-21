import { afterEach, beforeEach, expect, it, vi } from "vitest";
import study from "../src/content/prompts/issue-02-study-005.json";
import issue from "../src/content/issues/the-prompt-issue/issue.json";

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.doUnmock("../src/content/prompts/issue-02-study-005.json");
  vi.doUnmock("../src/content/issues/the-prompt-issue/issue.json");
  vi.doUnmock("../src/content/schema");
});

it("loads every valid study with no content errors", async () => {
  const { prompts, promptLoadErrors, currentIssue } =
    await import("../src/content");
  expect(prompts).toHaveLength(168);
  expect(prompts.map((prompt) => prompt.studyNumber)).not.toEqual(
    expect.arrayContaining([66, 69, 106, 115, 122, 126]),
  );
  expect(promptLoadErrors).toEqual([]);
  expect(currentIssue.slug).toBe("the-prompt-issue");
});

it("skips a malformed study, records its file and validation error, and keeps other studies sorted", async () => {
  vi.doMock("../src/content/prompts/issue-02-study-005.json", () => ({
    default: { ...study, prompt: "" },
  }));
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { prompts, promptLoadErrors } = await import("../src/content");
  expect(prompts).toHaveLength(167);
  expect(prompts.some((prompt) => prompt.id === "issue-02-study-005")).toBe(
    false,
  );
  expect(prompts.some((prompt) => prompt.id === "issue-02-study-006")).toBe(
    true,
  );
  const numbers = prompts.map((prompt) => prompt.studyNumber);
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  expect(promptLoadErrors).toEqual([
    { file: "./prompts/issue-02-study-005.json", error: expect.any(String) },
  ]);
  expect(promptLoadErrors[0].error).toContain("prompt");
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining(
      `${promptLoadErrors[0].file}: ${promptLoadErrors[0].error}`,
    ),
  );
});

it("reports a descriptive error when the required issue is missing", async () => {
  vi.doMock("../src/content/issues/the-prompt-issue/issue.json", () => ({
    default: { ...issue, slug: "another-issue" },
  }));
  await expect(import("../src/content/issues")).rejects.toThrow(
    'required issue "the-prompt-issue" is missing',
  );
});

it("loads content without importing the build-time Zod schemas", async () => {
  vi.doMock("../src/content/schema", () => {
    throw new Error("Build-time schemas must not be imported at runtime");
  });
  const { prompts, currentIssue } = await import("../src/content");
  expect(prompts).toHaveLength(168);
  expect(currentIssue.slug).toBe("the-prompt-issue");
});
