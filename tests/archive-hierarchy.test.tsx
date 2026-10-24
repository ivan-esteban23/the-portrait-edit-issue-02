import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ArchivePage } from "../src/pages/ArchivePage";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="query-string">{location.search}</div>;
}
function renderArchive(url = "/prompts") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ArchivePage />
      <LocationProbe />
    </MemoryRouter>,
  );
}
beforeEach(() => localStorage.clear());

it("keeps discovery visible while secondary filters and tools start closed", async () => {
  const user = userEvent.setup();
  renderArchive();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("165 studies");
  expect(screen.getByRole("button", { name: /Saved \(0\)/ })).toBeVisible();
  expect(screen.getByRole("region", { name: "Tag filters" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Model" })).not.toBeVisible();
  expect(
    screen.getByRole("button", { name: "Select Prompts" }),
  ).not.toBeVisible();
  await user.click(screen.getByText("More filters", { exact: true }));
  expect(screen.getByRole("combobox", { name: "Model" })).toBeVisible();
  await user.click(screen.getByText("Archive tools", { exact: true }));
  expect(screen.getByRole("button", { name: "Select Prompts" })).toBeVisible();
  expect(
    screen.getByRole("combobox", { name: "Moodboard collection" }),
  ).toBeVisible();
});

it("shows deep-linked filter values outside the closed disclosure and clears the query", async () => {
  const user = userEvent.setup();
  renderArchive("/prompts?q=Frost&tag=regal&model=Unspecified&ar=none&saved=1");
  const active = screen.getByRole("list", { name: "Active filters" });
  for (const label of [
    "Search: “Frost”",
    "Style: #regal",
    "Model: Unspecified",
    "Aspect ratio: Not recorded",
  ]) {
    expect(within(active).getByText(label)).toBeVisible();
  }
  expect(screen.getByText("More filters (3)", { exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: /Saved/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("button", { name: "Reset all filters" }),
  ).toHaveTextContent("Reset all");
  await user.click(screen.getByRole("button", { name: "Reset all filters" }));
  expect(screen.getByTestId("query-string")).toBeEmptyDOMElement();
  expect(screen.getByRole("searchbox", { name: "Search" })).toHaveFocus();
  expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("165 studies");
});
