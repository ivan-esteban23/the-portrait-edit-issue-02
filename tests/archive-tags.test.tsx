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

it("announces additional tags and exposes every tag and count through a keyboard disclosure", async () => {
  const user = userEvent.setup();
  const tags = renderArchive();
  const more = tags.getByRole("button", {
    name: `More tags (${counts.size - 1})`,
  });
  expect(more).toHaveAttribute("aria-expanded", "false");
  expect(
    document.getElementById(more.getAttribute("aria-controls")!),
  ).not.toBeVisible();
  expect(
    tags.queryByRole("button", { name: tagName("quietly melancholic") }),
  ).toBeNull();
  more.focus();
  await user.keyboard("{Enter}");
  expect(more).toHaveAttribute("aria-expanded", "true");
  expect(more).toHaveTextContent("Fewer tags");
  for (const name of counts.keys()) {
    expect(tags.getByRole("button", { name: tagName(name) })).toBeVisible();
  }
  await user.tab();
  expect(tags.getByRole("button", { name: tagName("bold") })).toHaveFocus();
  more.focus();
  await user.keyboard(" ");
  expect(more).toHaveAttribute("aria-expanded", "false");
  expect(more).toHaveFocus();
});

it("filters by a formerly hidden tag, pins its selected state when collapsed, and clears only the tag", async () => {
  const user = userEvent.setup();
  const tags = renderArchive("/prompts?model=Unspecified&ar=none");
  const more = tags.getByRole("button", { name: /^More tags/ });
  await user.click(more);
  const selected = tags.getByRole("button", {
    name: tagName("quietly melancholic"),
  });
  await user.click(selected);
  expect(selected).toHaveAttribute("aria-pressed", "true");
  expect(selected).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent(
    `${counts.get("quietly melancholic")} study`,
  );
  expect(screen.getByTestId("query-string").textContent).toContain(
    "tag=quietly+melancholic",
  );
  await user.click(more);
  expect(
    tags.getByRole("button", {
      name: tagName("quietly melancholic"),
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(more).toHaveTextContent(`More tags (${counts.size - 2})`);
  await user.click(tags.getByRole("button", { name: "Clear tag" }));
  expect(screen.getByTestId("query-string")).toHaveTextContent(
    "?model=Unspecified&ar=none",
  );
  expect(screen.getByRole("status")).toHaveTextContent("165 studies");
  expect(more).toHaveFocus();
  expect(tags.queryByRole("button", { name: "Clear tag" })).toBeNull();
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
