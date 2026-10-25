import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "../src/components/CopyLinkButton";
import { HomePage } from "../src/pages/HomePage";
import { NotFoundPage } from "../src/pages/NotFoundPage";
import { currentIssue, readerPath } from "../src/content";
import { saveReadingProgress } from "../src/hooks/useReadingProgress";

describe("homepage discovery and direct sharing", () => {
  beforeEach(() => localStorage.clear());

  it("exposes Browse studies in the hero and places selected studies before onboarding cards", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    const startReading = screen.getByRole("link", { name: "Start reading ↗" });
    const browseStudies = screen.getByRole("link", { name: "Browse studies" });
    expect(startReading).toHaveAttribute(
      "href",
      readerPath(currentIssue.slug, 1),
    );
    expect(browseStudies).toHaveAttribute("href", "/prompts");

    const fromArchiveHeading = screen.getByRole("heading", {
      name: "From the archive",
    });
    const onboardingHeading = screen.getByRole("heading", {
      name: "Make the issue yours",
    });
    expect(
      fromArchiveHeading.compareDocumentPosition(onboardingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("points returning readers to their page and active saved collection", () => {
    saveReadingProgress(currentIssue.slug, 60);
    localStorage.setItem(
      "portrait-edit-saved",
      JSON.stringify(["issue-02-study-001"]),
    );
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Resume reading · Page 60 ↗" }),
    ).toHaveAttribute("href", readerPath(currentIssue.slug, 60));
    expect(
      screen.getByRole("link", { name: "Browse studies" }),
    ).toHaveAttribute("href", "/prompts");
    expect(
      screen.getByRole("link", { name: /Continue on page 60/ }),
    ).toHaveAttribute("href", readerPath(currentIssue.slug, 60));
    expect(
      screen.getByRole("link", { name: /Browse 165 studies/ }),
    ).toHaveAttribute("href", "/prompts");
    expect(
      screen.getByRole("link", { name: /Your saved studies \(1\)/ }),
    ).toHaveAttribute("href", "/prompts?saved=1");
  });

  it("offers both reader and archive recovery links on the 404 page", () => {
    render(
      <MemoryRouter initialEntries={["/prompts/missing-study"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Back to the reader" }),
    ).toHaveAttribute("href", readerPath(currentIssue.slug));
    expect(
      screen.getByRole("link", { name: "Browse the archive" }),
    ).toHaveAttribute("href", "/prompts");
  });

  it("copies a canonical link, resets feedback on navigation, and ignores old copy results", async () => {
    let resolve!: () => void;
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(
        () =>
          new Promise<void>((done) => {
            resolve = done;
          }),
      );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { rerender } = render(
      <CopyLinkButton path="/prompts/issue-02-study-001" />,
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Copy link" })),
    );
    expect(writeText).toHaveBeenCalledWith(
      new URL(
        `${import.meta.env.BASE_URL}prompts/issue-02-study-001`,
        window.location.origin,
      ).href,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    rerender(<CopyLinkButton path={readerPath(currentIssue.slug, 61)} />);
    await act(async () => resolve());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Copy link" })),
    );
    expect(writeText).toHaveBeenLastCalledWith(
      new URL(
        `${import.meta.env.BASE_URL}issues/${currentIssue.slug}/pages/61`,
        window.location.origin,
      ).href,
    );
  });

  it("provides a selectable link when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    render(<CopyLinkButton path="/prompts/issue-02-study-001" />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Copy link" })),
    );
    const input = screen.getByRole("textbox", {
      name: "Link to copy",
    }) as HTMLInputElement;
    expect(input).toHaveValue(
      new URL(
        `${import.meta.env.BASE_URL}prompts/issue-02-study-001`,
        window.location.origin,
      ).href,
    );
    expect(input).toHaveAttribute("readonly");
    fireEvent.focus(input);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Select and copy this link",
    );
  });
});
