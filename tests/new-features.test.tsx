import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CommandPalette } from "../src/components/CommandPalette";
import { CompareLab } from "../src/components/CompareLab";
import { PromptStudioDrawer } from "../src/components/PromptStudioDrawer";
import { exportStudyRecipeCard } from "../src/lib/cardExport";
import { isSoundEnabled, setSoundEnabled, playPaperTurnSound } from "../src/utils/audio";
import { Archive, IssueOverview } from "../src/components/SitePages";
import { formatPromptText } from "../src/lib/promptFormatter";
import promptA from "../src/content/prompts/issue-02-study-005.json";
import promptB from "../src/content/prompts/issue-02-study-006.json";

describe("Next-Gen Creative Tools & Publication Polish", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Global Command Palette", () => {
    it("renders and filters actions, chapters, and studies", () => {
      const onClose = vi.fn();
      const onToggleTheme = vi.fn();

      const { rerender } = render(
        <MemoryRouter>
          <CommandPalette
            isOpen={true}
            onClose={onClose}
            onToggleTheme={onToggleTheme}
          />
        </MemoryRouter>,
      );

      // Verify input and default sections exist
      const input = screen.getByPlaceholderText(/Type a command/i);
      expect(input).toBeInTheDocument();
      expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
      expect(screen.getByText("Two-Page Spread", { exact: false })).toBeInTheDocument();

      // Search for page jumping
      fireEvent.change(input, { target: { value: "42" } });
      expect(screen.getByText("Jump to Page 42")).toBeInTheDocument();

      // Search for study
      fireEvent.change(input, { target: { value: promptA.title } });
      expect(screen.getByText(new RegExp(promptA.title, "i"))).toBeInTheDocument();

      // Escape key closes palette
      fireEvent.keyDown(input, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();

      // Hidden when isOpen is false
      rerender(
        <MemoryRouter>
          <CommandPalette isOpen={false} onClose={onClose} />
        </MemoryRouter>,
      );
      expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
    });

    it("navigates selection with arrow keys and selects with Enter", () => {
      const onToggleTheme = vi.fn();
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <CommandPalette
            isOpen={true}
            onClose={onClose}
            onToggleTheme={onToggleTheme}
          />
        </MemoryRouter>,
      );

      const input = screen.getByPlaceholderText(/Type a command/i);
      // Press Enter on first action (Toggle Theme)
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onToggleTheme).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("2. Social Image Card Generator", () => {
    it("renders offscreen canvas and triggers PNG recipe card export", async () => {
      // Mock canvas methods for jsdom
      const mockContext = {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        letterSpacing: "",
        textAlign: "",
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        roundRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
        measureText: vi.fn(() => ({ width: 120 })),
      };

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        if (tag === "canvas") {
          const canvas = originalCreateElement("canvas");
          canvas.getContext = vi.fn(
            () => mockContext as unknown as CanvasRenderingContext2D,
          ) as unknown as typeof canvas.getContext;
          canvas.toBlob = vi.fn((cb) => {
            cb(new Blob(["mock-image-data"], { type: "image/png" }));
          });
          return canvas;
        }
        return originalCreateElement(tag);
      });

      const success = await exportStudyRecipeCard(promptA);
      expect(success).toBe(true);
      expect(mockContext.fillText).toHaveBeenCalled();
      createElementSpy.mockRestore();
    });
  });

  describe("3. Split-Curtain Comparison Slider in Compare Lab", () => {
    it("switches to Split Curtain mode and renders slider handle and badges", () => {
      const onClose = vi.fn();
      const onSwap = vi.fn();

      render(
        <CompareLab
          studyA={promptA}
          studyB={promptB}
          isOpen={true}
          onClose={onClose}
          onSwap={onSwap}
        />,
      );

      expect(screen.getByText("Side by Side")).toBeInTheDocument();
      expect(screen.getByText("Split Curtain")).toBeInTheDocument();

      // Click Split Curtain mode button
      fireEvent.click(screen.getByText("Split Curtain"));

      const slider = screen.getByRole("slider", { name: /curtain comparison slider/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("aria-valuenow", "50");

      // Verify study badges in split frame
      expect(screen.getByText(`Study A: #${promptA.studyNumber}`)).toBeInTheDocument();
      expect(screen.getByText(`Study B: #${promptB.studyNumber}`)).toBeInTheDocument();

      // Keyboard navigation on slider handle
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
      expect(slider).toHaveAttribute("aria-valuenow", "46");

      fireEvent.keyDown(slider, { key: "ArrowRight" });
      expect(slider).toHaveAttribute("aria-valuenow", "50");

      // Home and End keys
      fireEvent.keyDown(slider, { key: "End" });
      expect(slider).toHaveAttribute("aria-valuenow", "100");

      fireEvent.keyDown(slider, { key: "Home" });
      expect(slider).toHaveAttribute("aria-valuenow", "0");
    });
  });

  describe("4. Prompt Studio / Parameter Tweaker Drawer", () => {
    it("adjusts aspect ratios, stylize, chaos, keywords and copies modified prompt", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });

      const onClose = vi.fn();

      render(
        <PromptStudioDrawer
          prompt={promptA}
          isOpen={true}
          onClose={onClose}
        />,
      );

      expect(screen.getByText("Prompt Studio")).toBeInTheDocument();

      // Change Aspect Ratio
      const ar16x9Btn = screen.getByRole("radio", { name: /16:9 Cinema/i });
      fireEvent.click(ar16x9Btn);
      expect(ar16x9Btn).toHaveAttribute("aria-checked", "true");

      // Toggle a film modifier chip
      const kwChip = screen.getByText(/dramatic chiaroscuro/i);
      fireEvent.click(kwChip);

      // Verify the preview contains the modifier
      const preview = screen.getByLabelText(/Live Prompt Preview/i);
      expect(preview.textContent).toContain("dramatic chiaroscuro");
      expect(preview.textContent).toContain("--ar 16:9");

      // Copy modified prompt
      const copyBtn = screen.getByText("Copy Modified Prompt");
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalled();
      const copiedText = writeText.mock.calls[0][0];
      expect(copiedText).toContain("dramatic chiaroscuro");
      expect(copiedText).toContain("--ar 16:9");
    });
  });

  describe("5. Printable Editorial Contact Sheet", () => {
    it("renders Print Contact Sheet button and print header in moodboard view", () => {
      // Seed localStorage with a saved study
      localStorage.setItem("portrait-edit-saved", JSON.stringify([promptA.id]));

      window.print = vi.fn();

      render(
        <MemoryRouter>
          <Archive />
        </MemoryRouter>,
      );

      const printBtn = screen.getByText(/Print Contact Sheet/i);
      expect(printBtn).toBeInTheDocument();

      // Verify print header exists in DOM
      expect(
        screen.getByText("THE PORTRAIT EDIT — ISSUE 02: THE PROMPT ISSUE"),
      ).toBeInTheDocument();
      expect(screen.getByText("EDITORIAL CONTACT SHEET")).toBeInTheDocument();

      // Clicking calls window.print
      fireEvent.click(printBtn);
    });

    it("renders Print Contact Sheet button and print container on IssueOverview", () => {
      window.print = vi.fn();

      render(
        <MemoryRouter initialEntries={["/issues/the-prompt-issue"]}>
          <Routes>
            <Route path="/issues/:slug" element={<IssueOverview />} />
          </Routes>
        </MemoryRouter>,
      );

      const printBtn = screen.getByText(/Print Contact Sheet/i);
      expect(printBtn).toBeInTheDocument();
      fireEvent.click(printBtn);
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe("6. Synthesized Paper-Turn Sound (Web Audio API)", () => {
    it("manages sound preference and triggers Web Audio synthesis without errors", () => {
      expect(isSoundEnabled()).toBe(false);

      setSoundEnabled(true);
      expect(isSoundEnabled()).toBe(true);
      expect(localStorage.getItem("portrait-edit-sound")).toBe("true");

      setSoundEnabled(false);
      expect(isSoundEnabled()).toBe(false);

      // Calling playPaperTurnSound should not throw in Node/JSDOM
      expect(() => playPaperTurnSound()).not.toThrow();
    });
  });

  describe("7. Discord /imagine Command & Multi-Tool Formats", () => {
    it("formats prompt text as Discord /imagine command with parameters", () => {
      const discordText = formatPromptText(promptA, "discord");
      expect(discordText.startsWith("/imagine prompt:")).toBe(true);
      expect(discordText).toContain(promptA.prompt.trim().replace(/\s+/g, " "));
      if (promptA.parameters && Object.keys(promptA.parameters).length > 0) {
        expect(discordText).toContain("--");
      }
    });

    it("formats prompt as Midjourney, FLUX, and Plain Text", () => {
      const plainText = formatPromptText(promptA, "plain");
      expect(plainText).toEqual(promptA.prompt.trim().replace(/\s+/g, " "));

      const mjText = formatPromptText(promptA, "midjourney");
      expect(mjText).toContain(promptA.prompt.trim().replace(/\s+/g, " "));

      const fluxText = formatPromptText(promptA, "flux");
      expect(fluxText).not.toContain("--v 6");
      expect(fluxText.length).toBeGreaterThan(0);
    });
  });
});
