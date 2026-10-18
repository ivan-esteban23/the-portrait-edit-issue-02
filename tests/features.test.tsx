import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { useBookmarks } from "../src/hooks/useBookmarks";
import { useTheme } from "../src/hooks/useTheme";
import { StudyCard } from "../src/components/StudyCard";
import { ImageLightbox } from "../src/components/ImageLightbox";
import prompt from "../src/content/prompts/issue-02-study-005.json";

function ThemeTestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme("paper")}>Set Paper</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
}

function BookmarksTestComponent() {
  const { isSaved, toggleSaved, savedCount } = useBookmarks();
  return (
    <div>
      <span data-testid="saved-count">{savedCount}</span>
      <span data-testid="is-saved">{isSaved(prompt.id) ? "yes" : "no"}</span>
      <button onClick={() => toggleSaved(prompt.id)}>Toggle Bookmark</button>
    </div>
  );
}

describe("Theme & Bookmarks features", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("manages themes and sets data-theme attribute on root element", () => {
    render(<ThemeTestComponent />);
    expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("system");

    fireEvent.click(screen.getByText("Set Paper"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("paper");
    expect(document.documentElement.getAttribute("data-theme")).toBe("paper");
    expect(localStorage.getItem("portrait-edit-theme")).toBe("paper");

    fireEvent.click(screen.getByText("Set Dark"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("portrait-edit-theme")).toBe("dark");
  });

  it("saves and toggles study bookmarks in localStorage", () => {
    render(<BookmarksTestComponent />);
    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");
    expect(screen.getByTestId("is-saved")).toHaveTextContent("no");

    fireEvent.click(screen.getByText("Toggle Bookmark"));
    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");
    expect(screen.getByTestId("is-saved")).toHaveTextContent("yes");
    expect(localStorage.getItem("portrait-edit-saved")).toContain(prompt.id);

    fireEvent.click(screen.getByText("Toggle Bookmark"));
    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");
    expect(screen.getByTestId("is-saved")).toHaveTextContent("no");
  });

  it("StudyCard quick-copies prompt without navigating", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const onToggleSaved = vi.fn();
    const onTagClick = vi.fn();

    render(
      <MemoryRouter>
        <StudyCard
          prompt={prompt}
          to={`/prompts/${prompt.id}`}
          isSaved={false}
          onToggleSaved={onToggleSaved}
          onTagClick={onTagClick}
        />
      </MemoryRouter>,
    );

    const copyBtn = screen.getByRole("button", {
      name: new RegExp(`Copy prompt for Study ${prompt.studyNumber}`),
    });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeText).toHaveBeenCalledWith(prompt.prompt);

    const bookmarkBtn = screen.getByRole("button", {
      name: new RegExp(`Save Study ${prompt.studyNumber}`),
    });
    fireEvent.click(bookmarkBtn);
    expect(onToggleSaved).toHaveBeenCalledWith(prompt.id);

    if (prompt.tags.length > 0) {
      const tagBtn = screen.getByText(`#${prompt.tags[0]}`);
      fireEvent.click(tagBtn);
      expect(onTagClick).toHaveBeenCalledWith(prompt.tags[0]);
    }
  });

  it("ImageLightbox provides zoom, pan, and escape key dismissal", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ImageLightbox
        src="/pages/060.webp"
        alt="Test Image"
        title="Page 60"
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Zoom in
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("150%")).toBeInTheDocument();

    // Reset zoom
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Dismiss with Escape key
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Close image lightbox" }),
      { key: "Escape" },
    );
    expect(onClose).toHaveBeenCalled();

    // Does not render when isOpen is false
    rerender(
      <ImageLightbox
        src="/pages/060.webp"
        alt="Test Image"
        isOpen={false}
        onClose={onClose}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
