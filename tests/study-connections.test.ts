import { expect, it } from "vitest";
import { prompts, currentIssue } from "../src/content";
import { getStudyConnections } from "../src/lib/studyConnections";

it("grounds connections in the published prompts, tags, or chapter for every study", () => {
  for (const current of prompts) {
    const connections = getStudyConnections(current, prompts, currentIssue);
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.length).toBeLessThanOrEqual(3);
    expect(new Set(connections.map((c) => c.target.id)).size).toBe(
      connections.length,
    );
    for (const connection of connections) {
      expect(connection.target.id).not.toBe(current.id);
      expect(current.prompt.toLowerCase()).toContain(
        connection.source.replace(/…$/, "").toLowerCase(),
      );
      expect(connection.target.prompt.toLowerCase()).toContain(
        connection.destination.replace(/…$/, "").toLowerCase(),
      );
      if (connection.basis.startsWith("Shared tags:"))
        expect(
          connection.target.tags.some((tag) => current.tags.includes(tag)),
        ).toBe(true);
      if (connection.basis.startsWith("Same chapter:")) {
        const chapter = currentIssue.chapters.find(
          (c) => current.page >= c.startPage && current.page <= c.endPage,
        )!;
        expect(connection.target.page).toBeGreaterThanOrEqual(
          chapter.startPage,
        );
        expect(connection.target.page).toBeLessThanOrEqual(chapter.endPage);
      }
      expect(
        getStudyConnections(
          current,
          prompts,
          currentIssue,
          connection.target.id,
        ).some((c) => c.target.id === connection.target.id),
      ).toBe(false);
    }
  }
});
it("offers the approved frame, color, and light comparisons from Study 004", () => {
  const connections = getStudyConnections(
    prompts.find((p) => p.studyNumber === 4)!,
    prompts,
    currentIssue,
  );
  expect(connections.map((c) => [c.dimension, c.target.studyNumber])).toEqual([
    ["Frame", 13],
    ["Color", 14],
    ["Light", 27],
  ]);
});
