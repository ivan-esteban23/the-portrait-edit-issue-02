import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { copyText } from "../src/lib/utils";
import { ArchivePage } from "../src/pages/ArchivePage";
import { StudyPage } from "../src/pages/StudyPage";
import { prompts } from "../src/content";
import App from "../src/App";
import { LanguageProvider } from "../src/i18n/LanguageProvider";

function stubClipboard(writeText: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}
function stubExec(result: boolean) {
  const exec = vi.fn(() => result);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: exec,
  });
  return exec;
}

it("falls back to execCommand when the Clipboard API rejects", async () => {
  stubClipboard(vi.fn().mockRejectedValue(Error("denied")));
  const exec = stubExec(true);
  await expect(copyText("hello")).resolves.toBeUndefined();
  expect(exec).toHaveBeenCalledWith("copy");
  expect(document.querySelector("textarea")).toBeNull();
});

it("rejects when both the Clipboard API and the fallback fail", async () => {
  stubClipboard(vi.fn().mockRejectedValue(Error("denied")));
  stubExec(false);
  await expect(copyText("hello")).rejects.toThrow("Copy unavailable");
});

it("does not use the fallback when the Clipboard API succeeds", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubClipboard(writeText);
  const exec = stubExec(true);
  await copyText("hello");
  expect(writeText).toHaveBeenCalledWith("hello");
  expect(exec).not.toHaveBeenCalled();
});

function renderArchive(url = "/prompts") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ArchivePage />
    </MemoryRouter>,
  );
}

it("never presents unrecorded aspect ratios as 4:5", () => {
  renderArchive();
  const select = screen.getByLabelText("Aspect Ratio") as HTMLSelectElement;
  const values = [...select.options].map((o) => o.value);
  // No study records --ar, so no ratio is offered except "Not recorded".
  expect(values).not.toContain("4:5");
  expect(values).toContain("none");
  expect(screen.getByRole("option", { name: "Not recorded" })).toBeTruthy();
});

it("filters every study without a recorded ratio under Not recorded", () => {
  renderArchive("/prompts?ar=none");
  expect(
    document.querySelectorAll(".archive-grid article, .archive-grid > *")
      .length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText(/No studies match/i)).toBeNull();
});

it("an old ?ar=4:5 link no longer claims the whole archive", () => {
  renderArchive("/prompts?ar=4:5");
  const select = screen.getByLabelText("Aspect Ratio") as HTMLSelectElement;
  expect(select.value).not.toBe("4:5");
});

it("reports a failed batch copy instead of failing silently", async () => {
  stubClipboard(vi.fn().mockRejectedValue(Error("denied")));
  stubExec(false);
  renderArchive();
  fireEvent.click(screen.getByRole("button", { name: "Select Prompts" }));
  fireEvent.click(screen.getByRole("button", { name: "Select All Filtered" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy Prompts" }));
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Copy unavailable");
  expect(
    screen.getByRole("button", { name: "Copy Prompts" }),
  ).toHaveTextContent("Copy Prompts");
}, 30_000);

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="path">{location.pathname + location.search}</output>
  );
}

function renderStudy(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/prompts/${id}`]}>
      <Routes>
        <Route path="/prompts/:id" element={<StudyPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

it("arrow keys change study when no dialog is open", () => {
  renderStudy(prompts[1].id);
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  expect(screen.getByTestId("path")).toHaveTextContent(
    `/prompts/${prompts[2].id}`,
  );
});

it("arrow keys do not leave the study while the image inspector is open", () => {
  renderStudy(prompts[1].id);
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  document.body.append(dialog);
  try {
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByTestId("path")).toHaveTextContent(
      `/prompts/${prompts[1].id}`,
    );
  } finally {
    dialog.remove();
  }
});

it("keeps ?focus= in sync when Focus changes outside the reader controls", async () => {
  localStorage.setItem("portrait-edit-focus-mode", "true");
  render(
    <MemoryRouter initialEntries={["/issues/the-prompt-issue/pages/3?focus=1"]}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
      <LocationProbe />
    </MemoryRouter>,
  );
  expect(screen.getByTestId("path")).toHaveTextContent("focus=1");
  // The command palette toggles Focus through App state, not reader controls.
  await act(async () => {
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  });
  fireEvent.click(await screen.findByText("Toggle Focus Mode"));
  await waitFor(() =>
    expect(screen.getByTestId("path")).toHaveTextContent("focus=0"),
  );
  expect(localStorage.getItem("portrait-edit-focus-mode")).toBe("false");
});
