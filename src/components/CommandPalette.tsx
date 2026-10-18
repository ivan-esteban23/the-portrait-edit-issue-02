import { useState, useEffect, useLayoutEffect, useRef, useId, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { currentIssue, prompts, readerPath } from "@/content";
import type { Theme } from "@/hooks/useTheme";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: Theme;
  onToggleTheme?: () => void;
  onToggleSpread?: () => void;
  onToggleFocus?: () => void;
  onOpenShortcuts?: () => void;
  onToggleSlideshow?: () => void;
  onToggleFullscreen?: () => void;
}

interface PaletteItem {
  id: string;
  section: "Actions" | "Chapters & Pages" | "Studies & Prompts";
  title: string;
  subtitle?: string;
  badge?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onToggleTheme,
  onToggleSpread,
  onToggleFocus,
  onOpenShortcuts,
  onToggleSlideshow,
  onToggleFullscreen,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const titleId = useId();

  // Reset before paint so reopening cannot erase a query already being typed.
  useLayoutEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const allActions: PaletteItem[] = useMemo(() => [
    {
      id: "act-theme",
      section: "Actions",
      title: "Toggle Theme",
      subtitle: "Switch between Light, Warm Paper, and Dark mode",
      badge: "M",
      action: () => {
        onToggleTheme?.();
        onClose();
      },
    },
    {
      id: "act-spread",
      section: "Actions",
      title: "Toggle Two-Page Spread",
      subtitle: "Switch between single-page and magazine spread on desktop",
      badge: "S",
      action: () => {
        onToggleSpread?.();
        onClose();
      },
    },
    {
      id: "act-focus",
      section: "Actions",
      title: "Toggle Focus Mode",
      subtitle: "Hide publication chrome and navigation bars",
      badge: "F",
      action: () => {
        onToggleFocus?.();
        onClose();
      },
    },
    {
      id: "act-slideshow",
      section: "Actions",
      title: "Play / Pause Presentation Slideshow",
      subtitle: "Autoplay magazine pages with smooth transition timing",
      badge: "P",
      action: () => {
        onToggleSlideshow?.();
        onClose();
      },
    },
    {
      id: "act-fullscreen",
      section: "Actions",
      title: "Toggle Fullscreen Reading",
      subtitle: "Switch to borderless distraction-free reading canvas",
      badge: "F",
      action: () => {
        if (onToggleFullscreen) onToggleFullscreen();
        else onToggleFocus?.();
        onClose();
      },
    },
    {
      id: "act-filter-ar-4-5",
      section: "Actions",
      title: "Filter Archive: 4:5 Portrait Aspect Ratio",
      subtitle: "Show prompts composed in vertical editorial 4:5 format",
      badge: "AR 4:5",
      action: () => {
        navigate("/prompts?ar=4:5");
        onClose();
      },
    },
    {
      id: "act-filter-ar-16-9",
      section: "Actions",
      title: "Filter Archive: 16:9 Cinematic Aspect Ratio",
      subtitle: "Show prompts composed in widescreen cinematic 16:9 format",
      badge: "AR 16:9",
      action: () => {
        navigate("/prompts?ar=16:9");
        onClose();
      },
    },
    {
      id: "act-filter-ar-1-1",
      section: "Actions",
      title: "Filter Archive: 1:1 Square Aspect Ratio",
      subtitle: "Show prompts composed in square 1:1 format",
      badge: "AR 1:1",
      action: () => {
        navigate("/prompts?ar=1:1");
        onClose();
      },
    },
    {
      id: "act-saved",
      section: "Actions",
      title: "View Saved Studies",
      subtitle: "Open the prompt archive filtered to your bookmarked studies",
      badge: "Archive",
      action: () => {
        navigate("/prompts?saved=1");
        onClose();
      },
    },
    {
      id: "act-pdf",
      section: "Actions",
      title: "Download Issue 02 PDF",
      subtitle: `Official publication release · ${(currentIssue.pdfBytes / 1e6).toFixed(1)} MB`,
      badge: "PDF ↗",
      action: () => {
        window.open(currentIssue.pdfUrl, "_blank", "noopener,noreferrer");
        onClose();
      },
    },
    {
      id: "act-shortcuts",
      section: "Actions",
      title: "Keyboard Shortcuts Cheatsheet",
      subtitle: "View complete list of navigation hotkeys",
      badge: "?",
      action: () => {
        onClose();
        onOpenShortcuts?.();
      },
    },
  ], [
    navigate,
    onClose,
    onOpenShortcuts,
    onToggleFocus,
    onToggleFullscreen,
    onToggleSlideshow,
    onToggleSpread,
    onToggleTheme,
  ]);

  // Compute matched items
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Number / Page jumping match
    const pageMatch = q.match(/^(?:(?:jump|page|p|go)\s*(?:to\s*)?)?(\d+)$/i);
    if (pageMatch) {
      const pageNum = Math.max(1, Math.min(currentIssue.pages, Number(pageMatch[1])));
      result.push({
        id: `page-jump-${pageNum}`,
        section: "Chapters & Pages",
        title: `Jump to Page ${pageNum}`,
        subtitle: `Navigate directly to page ${pageNum} of ${currentIssue.pages}`,
        badge: `Page ${pageNum}`,
        action: () => {
          navigate(readerPath(currentIssue.slug, pageNum));
          onClose();
        },
      });
    }

    // 2. Action matching
    if (!q) {
      result.push(...allActions);
    } else {
      const matchedActions = allActions.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle && a.subtitle.toLowerCase().includes(q)),
      );
      result.push(...matchedActions);
    }

    // 3. Chapters matching
    const chapters = currentIssue.chapters;
    const matchedChapters = chapters.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        `chapter ${c.startPage}`.includes(q),
    );

    matchedChapters.forEach((c) => {
      result.push({
        id: `chap-${c.startPage}`,
        section: "Chapters & Pages",
        title: c.title,
        subtitle: `Pages ${c.startPage}–${c.endPage} · Chapter opener`,
        badge: `p. ${c.startPage}`,
        action: () => {
          navigate(readerPath(currentIssue.slug, c.startPage));
          onClose();
        },
      });
    });

    // 4. Studies & Prompts matching
    if (q) {
      const matchedPrompts = prompts
        .filter((p) => {
          const numStr = String(p.studyNumber);
          const padded = numStr.padStart(3, "0");
          return (
            p.title.toLowerCase().includes(q) ||
            p.prompt.toLowerCase().includes(q) ||
            p.style.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)) ||
            numStr === q ||
            padded === q ||
            `study ${numStr}`.includes(q)
          );
        })
        .slice(0, 15); // Show top 15 most relevant studies

      matchedPrompts.forEach((p) => {
        result.push({
          id: `study-${p.id}`,
          section: "Studies & Prompts",
          title: `Study #${String(p.studyNumber).padStart(3, "0")}: ${p.title}`,
          subtitle: p.prompt.length > 90 ? `${p.prompt.slice(0, 90)}…` : p.prompt,
          badge: `p. ${p.page}`,
          action: () => {
            navigate(`/prompts/${p.id}`);
            onClose();
          },
        });
      });
    } else {
      // If no query, show featured studies
      const featured = currentIssue.featured
        .map((fid) => prompts.find((p) => p.id === fid))
        .filter((p): p is (typeof prompts)[0] => Boolean(p));

      featured.slice(0, 5).forEach((p) => {
        result.push({
          id: `featured-${p.id}`,
          section: "Studies & Prompts",
          title: `Featured #${String(p.studyNumber).padStart(3, "0")}: ${p.title}`,
          subtitle: p.prompt.length > 90 ? `${p.prompt.slice(0, 90)}…` : p.prompt,
          badge: `p. ${p.page}`,
          action: () => {
            navigate(`/prompts/${p.id}`);
            onClose();
          },
        });
      });
    }

    return result;
  }, [allActions, navigate, onClose, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (items.length === 0) return 0;
      return Math.min(prev, items.length - 1);
    });
  }, [items.length]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(
        `[data-index="${selectedIndex}"]`,
      );
      activeEl?.scrollIntoView?.({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length ? (prev - 1 + items.length) % items.length : 0,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  // Group items by section
  let lastSection = "";

  return (
    <div
      className="command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="command-palette-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="palette-input-wrap">
          <svg
            className="palette-search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            id={titleId}
            type="text"
            className="palette-search-input"
            placeholder="Type a command, page number, or search 174 studies…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-autocomplete="list"
            aria-controls="palette-results-list"
          />
          {query ? (
            <button
              type="button"
              className="palette-clear-btn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : (
            <kbd className="palette-esc-badge" aria-hidden="true">
              ESC
            </kbd>
          )}
        </div>

        <div
          ref={listRef}
          id="palette-results-list"
          className="palette-results"
          role="listbox"
          aria-label="Command results"
        >
          {items.length === 0 ? (
            <div className="palette-empty">
              <p>No actions, chapters, or studies match “{query}”</p>
              <small>Try searching for a style keyword, page number, or chapter title.</small>
            </div>
          ) : (
            items.map((item, idx) => {
              const showSection = item.section !== lastSection;
              lastSection = item.section;
              const isSelected = idx === selectedIndex;

              return (
                <div key={item.id}>
                  {showSection && (
                    <div className="palette-section-header" role="presentation">
                      {item.section}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={idx}
                    className={`palette-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="palette-item-text">
                      <div className="palette-item-title">{item.title}</div>
                      {item.subtitle && (
                        <div className="palette-item-subtitle">{item.subtitle}</div>
                      )}
                    </div>
                    {item.badge && (
                      <span className="palette-item-badge">{item.badge}</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <footer className="palette-footer">
          <div className="palette-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
          <div className="palette-count">
            {items.length} {items.length === 1 ? "result" : "results"}
          </div>
        </footer>
      </div>
    </div>
  );
}
