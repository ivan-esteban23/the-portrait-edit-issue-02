import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { Reader } from "../src/components/Reader";
import { HomePage as Home } from "../src/pages/HomePage";
import { IssueOverviewPage as IssueOverview } from "../src/pages/IssueOverviewPage";
import { currentIssue, prompts, readerPath } from "../src/content";

// Resume actions do not need the full 168-card print contact sheet.
vi.mock("../src/components/StudyCard", () => ({ StudyCard: () => null }));

const KEY = "portrait-edit-last-read";
const study = prompts.find(
  (p) => p.issueSlug === currentIssue.slug && p.page === 60,
)!;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
});
function ReaderHarness() {
  const [focus, setFocus] = useState(false);
  return (
    <>
      <Reader focus={focus} setFocus={setFocus} />
      <Link to="/">Home</Link>
    </>
  );
}
function reader(page = 60) {
  return render(
    <MemoryRouter initialEntries={[readerPath(currentIssue.slug, page)]}>
      <Routes>
        <Route path="/issues/:slug/pages/:page" element={<ReaderHarness />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );
}
function overview() {
  return render(
    <MemoryRouter initialEntries={[`/issues/${currentIssue.slug}`]}>
      <Routes>
        <Route path="/issues/:slug" element={<IssueOverview />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("renders and toggles the toolbar bookmark with storage, icon, haptic, and live feedback", () => {
  const vibrate = vi.fn();
  vi.stubGlobal(
    "navigator",
    Object.assign(Object.create(navigator), { vibrate }),
  );
  const { container } = reader();
  const toggle = screen.getByRole("button", {
    name: "Save study to bookmarks",
  });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(toggle.querySelector("svg")).toHaveAttribute("fill", "none");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute(
    "aria-label",
    "Remove study from saved bookmarks",
  );
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(toggle.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  expect(JSON.parse(localStorage.getItem("portrait-edit-saved")!)).toContain(
    study.id,
  );
  expect(container.querySelector(".reader-announcer")).toHaveTextContent(
    "Study 005 saved to bookmarks",
  );
  fireEvent.keyDown(document, { key: "B" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(container.querySelector(".reader-announcer")).toHaveTextContent(
    "removed from saved bookmarks",
  );
  expect(vibrate).toHaveBeenCalledTimes(2);
});
it("ignores bookmark repeats, modified shortcuts, input typing, and open dialogs", () => {
  reader();
  const toggle = screen.getByRole("button", {
    name: "Save study to bookmarks",
  });
  fireEvent.keyDown(document, { key: "b", repeat: true });
  fireEvent.keyDown(document, { key: "b", ctrlKey: true });
  fireEvent.keyDown(screen.getByLabelText("Page number", { exact: true }), {
    key: "b",
  });
  fireEvent.click(screen.getByRole("button", { name: "Display" }));
  fireEvent.keyDown(document, { key: "b" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(
    within(screen.getByRole("dialog")).getByText(/B Bookmark/),
  ).toBeInTheDocument();
});
it("does not offer bookmarking on front matter", () => {
  reader(1);
  expect(
    screen.queryByRole("button", { name: "Save study to bookmarks" }),
  ).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: "b" });
  expect(localStorage.getItem("portrait-edit-saved")).toBeNull();
});
it("bookmarks the active spread page and persists the active page", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      Object.assign(new EventTarget(), {
        matches: query.includes("min-width"),
        media: query,
        onchange: null,
      }),
    ),
  );
  localStorage.setItem("portrait-edit-spread", "true");
  reader(61);
  fireEvent.keyDown(document, { key: "b" });
  expect(JSON.parse(localStorage.getItem("portrait-edit-saved")!)).toEqual([
    prompts.find((p) => p.page === 61)!.id,
  ]);
  expect(JSON.parse(localStorage.getItem(KEY)!)[currentIssue.slug]).toBe(61);
});
it("keeps the toolbar and embedded study bookmark synchronized in both directions", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      Object.assign(new EventTarget(), {
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
      }),
    ),
  );
  reader();
  const tools = screen.queryByRole("button", { name: "Tools" });
  if (tools) fireEvent.click(tools);
  const toolbar = screen.getByRole("button", {
    name: "Save study to bookmarks",
  });
  fireEvent.click(toolbar);
  const embedded = screen.getByRole("button", {
    name: "Remove from saved",
  });
  expect(embedded).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(embedded);
  expect(toolbar).toHaveAttribute("aria-pressed", "false");
});
it("persists visits and turns while preserving other issues, then resumes after remount", () => {
  localStorage.setItem(KEY, JSON.stringify({ other: 12 }));
  const view = reader();
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
    other: 12,
    [currentIssue.slug]: 60,
  });
  fireEvent.keyDown(document, { key: "j" });
  expect(JSON.parse(localStorage.getItem(KEY)!)[currentIssue.slug]).toBe(61);
  view.unmount();
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Resume reading · Page 61 ↗" }),
  ).toHaveAttribute("href", readerPath(currentIssue.slug, 61));
  expect(
    screen.getByRole("link", { name: "Read The Prompt Issue" }),
  ).toHaveAttribute("href", readerPath(currentIssue.slug, 61));
  expect(
    screen.getByRole("link", { name: "Start from beginning" }),
  ).toHaveAttribute("href", readerPath(currentIssue.slug));
  expect(
    screen.getByRole("link", { name: "Inside the issue" }),
  ).toBeInTheDocument();
});
it("shows resume reading after navigating from reader to Home within a session", () => {
  reader();
  fireEvent.click(screen.getByRole("link", { name: "Home" }));
  expect(
    screen.getByRole("link", { name: "Resume reading · Page 60 ↗" }),
  ).toBeInTheDocument();
});
it("offers resume, beginning, print, and PDF on Issue Overview", () => {
  localStorage.setItem(KEY, JSON.stringify({ [currentIssue.slug]: 75 }));
  overview();
  expect(
    screen.getByRole("link", { name: "Resume reading (Page 75) ↗" }),
  ).toHaveAttribute("href", readerPath(currentIssue.slug, 75));
  expect(
    screen.getByRole("link", { name: "Start from beginning" }),
  ).toHaveAttribute("href", readerPath(currentIssue.slug));
  expect(
    screen.getByRole("button", { name: "Print Contact Sheet 🖨" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Download PDF/ }),
  ).toBeInTheDocument();
});
it.each([
  null,
  "broken",
  "null",
  "[]",
  "1",
  ...[1, 0, -2, 3.5, "60", 999].map((page) =>
    JSON.stringify({ [currentIssue.slug]: page }),
  ),
])(
  "falls back to Start reading for missing, malformed or invalid progress %s",
  (value) => {
    if (value !== null) localStorage.setItem(KEY, value);
    const home = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Start reading ↗" }),
    ).toHaveAttribute("href", readerPath(currentIssue.slug));
    expect(
      screen.queryByRole("link", { name: /Resume reading/ }),
    ).not.toBeInTheDocument();
    home.unmount();
    overview();
    expect(screen.getByRole("link", { name: "Start reading" })).toHaveAttribute(
      "href",
      readerPath(currentIssue.slug),
    );
  },
);
it("updates resume actions when another tab changes or clears progress", () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  act(() => {
    localStorage.setItem(KEY, JSON.stringify({ [currentIssue.slug]: 42 }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  });
  expect(
    screen.getByRole("link", { name: /Resume reading · Page 42/ }),
  ).toBeInTheDocument();
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  });
  expect(
    screen.getByRole("link", { name: "Start reading ↗" }),
  ).toBeInTheDocument();
});
it("continues reading when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  const view = reader();
  fireEvent.keyDown(document, { key: "j" });
  expect(screen.getByLabelText("Page number", { exact: true })).toHaveValue(61);
  view.unmount();
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Start reading ↗" }),
  ).toBeInTheDocument();
});
