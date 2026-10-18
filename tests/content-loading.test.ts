import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());

it("loads every valid study with no content errors", async () => {
  const { prompts, promptLoadErrors, currentIssue } =
    await import("../src/content");
  expect(prompts).toHaveLength(174);
  expect(promptLoadErrors).toEqual([]);
  expect(currentIssue.slug).toBe("the-prompt-issue");
});

it("skips a malformed study, records its file and validation error, and keeps other studies sorted", async () => {
  const { promptSchema } = await import("../src/content/schema");
  const parse = promptSchema.parse.bind(promptSchema);
  vi.spyOn(promptSchema, "parse").mockImplementation((data) => {
    const record = data as Record<string, unknown>;
    return parse(
      record.id === "issue-02-study-005" ? { ...record, prompt: "" } : data,
    );
  });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { prompts, promptLoadErrors } = await import("../src/content");
  expect(prompts).toHaveLength(173);
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
  const { issueSchema } = await import("../src/content/schema");
  const parse = issueSchema.parse.bind(issueSchema);
  vi.spyOn(issueSchema, "parse").mockImplementation((data) => ({
    ...parse(data),
    slug: "another-issue",
  }));
  await expect(import("../src/content/issues")).rejects.toThrow(
    'required issue "the-prompt-issue" is missing',
  );
});
