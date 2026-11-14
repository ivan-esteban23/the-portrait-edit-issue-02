import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { StudySearch } from "../src/components/StudySearch";
import {
  matchesArchiveScope,
  rankSearchResults,
  searchTopics,
} from "../src/lib/archiveSearch";
import { prompts } from "../src/content";
function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search} {JSON.stringify(location.state)}
    </output>
  );
}
beforeEach(() => localStorage.clear());
it("keeps ranked suggestions, topic shortcuts, keyboard focus, and archive return context functional", async () => {
  const user = userEvent.setup(),
    onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={["/prompts?selection=studio&q=ponytail"]}>
      <StudySearch onClose={onClose} onOpenCommands={() => {}} />
      <LocationProbe />
    </MemoryRouter>,
  );
  const dialog = screen.getByRole("dialog", { name: "Find a starting point." }),
    input = within(dialog).getByRole("searchbox", { name: "Search studies" });
  expect(input).toHaveValue("ponytail");
  expect(within(dialog).getByRole("status")).toHaveTextContent("1 study");
  await user.clear(input);
  await user.type(input, "004");
  await user.keyboard("{ArrowDown}");
  expect(
    within(dialog).getByRole("link", { name: /Studio Ponytail Portrait/ }),
  ).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onClose).toHaveBeenCalled();
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/prompts/issue-02-study-004",
  );
  expect(screen.getByTestId("location")).toHaveTextContent(
    "?selection=studio&q=004",
  );
});
it("recovers from a scoped empty state without changing the original archive filters", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/prompts?selection=studio"]}>
      <StudySearch onClose={() => {}} onOpenCommands={() => {}} />
      <LocationProbe />
    </MemoryRouter>,
  );
  const input = screen.getByRole("searchbox");
  await user.type(input, "snow");
  expect(screen.getByText("No matching studies.")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Search all studies instead ↗" }),
  );
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/prompts?selection=studio",
  );
  expect(screen.queryByText("No matching studies.")).toBeNull();
  await user.click(
    screen.getByRole("button", { name: /View all \d+ results/ }),
  );
  expect(screen.getByTestId("location")).toHaveTextContent("/prompts?q=snow");
});
it("grounds every topic in real results and preserves all supported scope filters", () => {
  for (const group of searchTopics)
    for (const [, query] of group.items)
      expect(rankSearchResults(prompts, query).length).toBeGreaterThan(0);
  const study = prompts.find((p) => p.studyNumber === 4)!;
  expect(
    matchesArchiveScope(
      study,
      new URLSearchParams("selection=studio&model=Unspecified&ar=none&saved=1"),
      () => true,
    ),
  ).toBe(true);
  expect(
    matchesArchiveScope(study, new URLSearchParams("saved=1"), () => false),
  ).toBe(false);
  expect(
    matchesArchiveScope(
      study,
      new URLSearchParams("selection=fantasy"),
      () => true,
    ),
  ).toBe(false);
});
