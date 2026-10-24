import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ArchivePage as Archive } from "../src/pages/ArchivePage";
import { PromptStudioDrawer } from "../src/components/PromptStudioDrawer";
import { Reader } from "../src/components/Reader";
import { generateMarkdownDossier } from "../src/lib/dossier";
import { prompts, currentIssue } from "../src/content";
import promptA from "../src/content/prompts/issue-02-study-005.json";
import promptB from "../src/content/prompts/issue-02-study-006.json";

function ReaderHarness({ initialFocus = false }: { initialFocus?: boolean }) {
  const [focus, setFocus] = useState(initialFocus);
  return <Reader focus={focus} setFocus={setFocus} />;
}

function renderReader(page = 1) {
  return render(
    <MemoryRouter
      initialEntries={[`/issues/${currentIssue.slug}/pages/${page}`]}
    >
      <Routes>
        <Route path="/issues/:slug/pages/:page" element={<ReaderHarness />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Editorial Enhancements: Slideshow, Export, Presets & Filtering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Markdown Dossier Generator", () => {
    it("formats frontmatter and structured studies correctly", () => {
      const markdown = generateMarkdownDossier(
        [promptA as any, promptB as any],
        "October 18, 2026",
      );

      expect(markdown).toContain("---");
      expect(markdown).toContain("title: The Portrait Edit — Curated Dossier");
      expect(markdown).toContain('date: "October 18, 2026"');
      expect(markdown).toContain("count: 2");
      expect(markdown).toContain("# The Portrait Edit — Curated Study Dossier");
      expect(markdown).toContain(
        `## Study #${String(promptA.studyNumber).padStart(3, "0")}: ${promptA.title}`,
      );
      expect(markdown).toContain(`> ${promptA.prompt}`);
      expect(markdown).toContain(
        `- **Model**: ${promptA.model || "Midjourney"}`,
      );
      expect(markdown).toContain(`- **Page**: ${promptA.page}`);
      expect(markdown).toContain(
        `## Study #${String(promptB.studyNumber).padStart(3, "0")}: ${promptB.title}`,
      );
    });
  });

  describe("2. Archive Multi-Select Batch Actions", () => {
    it("toggles select mode, selects prompts, and supports batch copy & clearing", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      render(
        <MemoryRouter initialEntries={["/?q=Frost+Fantasy"]}>
          <Archive />
        </MemoryRouter>,
      );

      // Initially no batch toolbar
      expect(screen.queryByText(/prompts selected/i)).not.toBeInTheDocument();

      // Click "Select Prompts" button
      fireEvent.click(screen.getByText("Archive tools", { exact: true }));
      const toggleSelectBtn = screen.getByRole("button", {
        name: "Select Prompts",
      });
      fireEvent.click(toggleSelectBtn);
      expect(
        screen.getByRole("button", { name: "Cancel Selection" }),
      ).toBeInTheDocument();

      // Select all filtered
      const selectAllBtn = screen.getByRole("button", {
        name: "Select All Filtered",
      });
      fireEvent.click(selectAllBtn);

      // Verify floating toolbar appears
      const countIndicator = screen.getByText(/1 prompt selected/i);
      expect(countIndicator).toBeInTheDocument();

      // Batch copy prompts
      const copyBtn = screen.getByRole("button", { name: "Copy Prompts" });
      await act(async () => {
        fireEvent.click(copyBtn);
      });
      expect(writeText).toHaveBeenCalled();
      const copiedText = writeText.mock.calls[0][0];
      expect(copiedText).toContain(promptA.prompt);

      // Clear selection
      const clearBtn = screen.getByRole("button", { name: "Clear" });
      fireEvent.click(clearBtn);
      expect(screen.queryByText(/prompts selected/i)).not.toBeInTheDocument();
    }, 30000);

    it("triggers file download for Markdown dossier and JSON export", () => {
      // Mock anchor click and URL methods
      const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      const revokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = createObjectURL;
      globalThis.URL.revokeObjectURL = revokeObjectURL;

      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={["/?q=Frost+Fantasy"]}>
          <Archive />
        </MemoryRouter>,
      );

      // Enter selection mode and select all
      fireEvent.click(screen.getByText("Archive tools", { exact: true }));
      fireEvent.click(screen.getByRole("button", { name: "Select Prompts" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Select All Filtered" }),
      );

      // Export Markdown Dossier
      const exportMdBtn = screen.getByRole("button", {
        name: /Export Markdown Dossier/i,
      });
      fireEvent.click(exportMdBtn);
      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      // Export JSON
      const exportJsonBtn = screen.getByRole("button", {
        name: /Export JSON/i,
      });
      fireEvent.click(exportJsonBtn);
      expect(clickSpy).toHaveBeenCalledTimes(2);

      clickSpy.mockRestore();
    }, 30000);
  });

  describe("3. Archive Aspect Ratio & Tag Filtering", () => {
    it("filters archive by aspect ratio and tag, then resets filters", () => {
      render(
        <MemoryRouter>
          <Archive />
        </MemoryRouter>,
      );

      // Only metadata-backed facets are shown; style remains available.
      fireEvent.click(screen.getByText(/^More filters/));
      expect(screen.queryByLabelText("Aspect Ratio")).not.toBeInTheDocument();
      const styleSelect = screen.getByLabelText("Style / tag");
      fireEvent.change(styleSelect, { target: { value: "regal" } });
      expect((styleSelect as HTMLSelectElement).value).toBe("regal");

      // Reset filters button should appear
      const resetBtn = screen.getByRole("button", {
        name: /Reset all filters/i,
      });
      expect(resetBtn).toBeInTheDocument();

      // Filter by tag if available
      const firstTagPill = document.querySelector(
        ".tag-pill",
      ) as HTMLElement | null;
      if (firstTagPill) {
        fireEvent.click(firstTagPill);
        expect(firstTagPill.getAttribute("aria-pressed")).toBe("true");
      }

      // Click Reset all filters
      fireEvent.click(resetBtn);
      expect((styleSelect as HTMLSelectElement).value).toBe("");
      expect(
        screen.queryByRole("button", { name: /Reset all filters/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("4. Prompt Studio Presets & Local Remix History", () => {
    it("applies style preset chips, tracks remixes in localStorage, and re-applies remix", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const onClose = vi.fn();
      render(
        <PromptStudioDrawer
          prompt={promptA as any}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Apply preset "High Fashion 4:5"
      const highFashionBtn = screen.getByRole("button", {
        name: "High Fashion 4:5",
      });
      fireEvent.click(highFashionBtn);

      const preview = screen.getByLabelText(/Live Prompt Preview/i);
      expect(preview.textContent).toContain("--ar 4:5");
      expect(preview.textContent).toMatch(/--(?:s|stylize) 750/);
      expect(preview.textContent).toContain("--style raw");

      // Apply preset "Cinematic 16:9"
      const cinematicBtn = screen.getByRole("button", {
        name: "Cinematic 16:9",
      });
      fireEvent.click(cinematicBtn);
      expect(preview.textContent).toContain("--ar 16:9");
      expect(preview.textContent).toMatch(/--(?:s|stylize) 250/);
      expect(preview.textContent).toContain("--v 6.1");

      // Copy modified prompt -> saves to history
      const copyBtn = screen.getByText("Copy Modified Prompt");
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      // Verify localStorage was populated
      const savedRemixes = JSON.parse(
        localStorage.getItem("the-portrait-edit:remixes") || "[]",
      );
      expect(savedRemixes).toHaveLength(1);
      expect(savedRemixes[0].title).toBe(promptA.title);
      expect(savedRemixes[0].parameters["ar"]).toBe("16:9");

      // Click Re-apply settings
      const reapplyBtn = screen.getByRole("button", {
        name: "Re-apply settings",
      });
      fireEvent.click(reapplyBtn);
      expect(preview.textContent).toContain("--ar 16:9");

      // Clear history
      const clearHistoryBtn = screen.getByRole("button", {
        name: "Clear history",
      });
      fireEvent.click(clearHistoryBtn);
      expect(
        JSON.parse(localStorage.getItem("the-portrait-edit:remixes") || "[]"),
      ).toHaveLength(0);
    });
  });

  describe("5. Reader Slideshow & Fullscreen shortcuts", () => {
    it("toggles slideshow playback via button and p shortcut, and toggles fullscreen via f", async () => {
      const user = userEvent.setup();
      const { container } = renderReader(1);

      const slideshowBtn = screen.getByRole("button", {
        name: "Toggle presentation slideshow",
      });
      expect(slideshowBtn).toHaveAttribute("aria-pressed", "false");

      // Press 'p' to start slideshow
      await user.keyboard("p");
      expect(slideshowBtn).toHaveAttribute("aria-pressed", "true");
      expect(
        container.querySelector(".reader-slideshow-progress"),
      ).toBeInTheDocument();

      // Press 'p' again to pause
      await user.keyboard("p");
      expect(slideshowBtn).toHaveAttribute("aria-pressed", "false");

      // Press 'f' for fullscreen / focus mode
      const live = container.querySelector(".reader-announcer")!;
      await user.keyboard("f");
      expect(live).toHaveTextContent("Focus mode activated");

      await user.keyboard("f");
      expect(live).toHaveTextContent("Focus mode deactivated");
    });
  });
});
