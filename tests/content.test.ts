import { describe, it, expect } from "vitest";
import { issueSchema, promptSchema } from "../src/content/schema";
import issue from "../src/content/issues/the-prompt-issue/issue.json";
import prompt from "../src/content/prompts/issue-02-study-005.json";
describe("Content diagnostics", () => {
  it("accepts source records with honestly unknown generation data", () => {
    expect(issueSchema.parse(issue).pages).toBe(196);
    expect(promptSchema.parse(prompt).model).toBeNull();
  });
  it("rejects missing prompt text, invalid dates and unsafe asset paths", () => {
    for (const patch of [
      { prompt: "" },
      { date: "yesterday" },
      { referenceImage: "../secret.jpeg" },
    ])
      expect(promptSchema.safeParse({ ...prompt, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects reversed chapter bounds", () => {
    expect(
      issueSchema.safeParse({
        ...issue,
        chapters: [{ title: "Bad", startPage: 5, endPage: 2 }],
      }).success,
    ).toBe(false);
  });
});
