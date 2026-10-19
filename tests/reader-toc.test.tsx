import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Reader } from "../src/components/Reader";
import { CommandPalette } from "../src/components/CommandPalette";
import { currentIssue, readerPath } from "../src/content";

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

it("opens the chapter index with T and navigates to a selected chapter", async () => {
  window.scrollTo = () => {};
  render(
    <MemoryRouter initialEntries={[readerPath(currentIssue.slug, 1)]}>
      <Routes>
        <Route
          path="/issues/:slug/pages/:page"
          element={<Reader focus={false} setFocus={() => {}} />}
        />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
  fireEvent.keyDown(document, { key: "t" });
  expect(
    await screen.findByRole("dialog", { name: "Table of contents" }),
  ).toBeInTheDocument();
  const chapter = currentIssue.chapters[0];
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Table of contents" })).getByRole(
      "button",
      { name: new RegExp(chapter.title) },
    ),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Current path")).toHaveTextContent(
      readerPath(currentIssue.slug, chapter.startPage),
    ),
  );
  expect(
    screen.queryByRole("dialog", { name: "Table of contents" }),
  ).not.toBeInTheDocument();
});

it("opens the reader TOC from the global command palette", async () => {
  window.scrollTo = () => {};
  render(
    <MemoryRouter initialEntries={["/prompts"]}>
      <Routes>
        <Route
          path="/prompts"
          element={<CommandPalette isOpen onClose={() => {}} />}
        />
        <Route
          path="/issues/:slug/pages/:page"
          element={<Reader focus={false} setFocus={() => {}} />}
        />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("Open Table of Contents"));
  expect(
    await screen.findByRole("dialog", { name: "Table of contents" }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByLabelText("Current path")).toHaveTextContent(
      readerPath(currentIssue.slug, 1),
    ),
  );
});
