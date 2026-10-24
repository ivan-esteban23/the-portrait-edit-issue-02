import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ArchivePage } from "../src/pages/ArchivePage";
import { prompts } from "../src/content";

const counts = new Map<string, number>();
for (const prompt of prompts) {
  for (const tag of prompt.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
}
const tagName = (tag: string) => `#${tag} (${counts.get(tag)})`;

function LocationProbe() {
  return <div data-testid="query-string">{useLocation().search}</div>;
}

function renderArchive(url = "/prompts") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ArchivePage />
      <LocationProbe />
    </MemoryRouter>,
  );
  return within(screen.getByRole("region", { name: "Tag filters" }));
}

beforeEach(() => localStorage.clear());

it("searches all tags in a dialog, retains selection, and restores focus on completion", async () => {
  const user = userEvent.setup();
  const tags = renderArchive("/prompts?model=Unspecified&ar=none");
  const more = tags.getByRole("button", { name: /^More tags/ });
  expect(more).toHaveAttribute("aria-expanded", "false");
  more.focus();
  await user.keyboard("{Enter}");
  const picker = within(screen.getByRole("dialog", { name: "Browse tags" }));
  const search = picker.getByRole("searchbox", { name: "Find a tag" });
  expect(search).toHaveFocus();
  for (const name of counts.keys())
    expect(picker.getByRole("button", { name: tagName(name) })).toBeVisible();
  await user.type(search, " #quietly melancholic ");
  expect(picker.getAllByRole("button", { name: /^#/ })).toHaveLength(1);
  const selected = picker.getByRole("button", {
    name: tagName("quietly melancholic"),
  });
  await user.click(selected);
  expect(selected).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("query-string").textContent).toContain(
    "tag=quietly+melancholic",
  );
  await user.click(picker.getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(more).toHaveFocus();
  expect(
    tags.getByRole("button", { name: tagName("quietly melancholic") }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(tags.getByRole("button", { name: "Clear tag" }));
  expect(screen.getByTestId("query-string")).toHaveTextContent(
    "?model=Unspecified&ar=none",
  );
  expect(more).toHaveFocus();
});

it("explains empty tag searches and dismisses with Escape without changing archive filters", async () => {
  const user = userEvent.setup();
  const tags = renderArchive("/prompts?q=portrait&tag=moody");
  const more = tags.getByRole("button", { name: /^More tags/ });
  await user.click(more);
  const search = screen.getByRole("searchbox", { name: "Find a tag" });
  await user.type(search, "no-such-tag");
  expect(screen.getByText(/No matching tags/)).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(more).toHaveFocus();
  expect(screen.getByTestId("query-string")).toHaveTextContent(
    "?q=portrait&tag=moody",
  );
});

it("keeps a deep-linked tag visible and restores focus when its pinned toggle is cleared", async () => {
  const user = userEvent.setup();
  const tags = renderArchive("/prompts?tag=victorian-inspired&q=Portrait");
  const selected = tags.getByRole("button", {
    name: tagName("victorian-inspired"),
  });
  expect(selected).toBeVisible();
  expect(selected).toHaveAttribute("aria-pressed", "true");
  await user.click(selected);
  expect(screen.getByTestId("query-string")).toHaveTextContent("?q=Portrait");
  expect(tags.getByRole("button", { name: /^More tags/ })).toHaveFocus();
  expect(
    tags.queryByRole("button", {
      name: tagName("victorian-inspired"),
    }),
  ).toBeNull();
});
