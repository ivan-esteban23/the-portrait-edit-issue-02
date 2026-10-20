import { Icon } from "@/components/ui/Icon";
import { useState, useEffect, useLayoutEffect, useRef, useId, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { currentIssue, prompts, readerPath } from "@/content";
import type { Theme } from "@/hooks/useTheme";
import {
  getSoundscapePreference,
  startFocusSoundscape,
  stopFocusSoundscape,
} from "@/lib/soundscape";

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
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
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
      id: "act-filter-ar-none",
      section: "Actions",
      title: "Filter Archive: Aspect Ratio Not Recorded",
      subtitle: "Show studies whose prompt does not record an --ar parameter",
      badge: "AR",
      action: () => {
        navigate("/prompts?ar=none");
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
    {
      id: "act-toc",
      section: "Actions",
      title: "Open Table of Contents",
      subtitle: "Browse issue chapters and jump to a chapter opening",
      badge: "T",
      action: () => {
        if (/\/pages\/\d+\/?$/.test(location.pathname)) {
          window.dispatchEvent(new Event("reader:open-toc"));
        } else {
          navigate(`${readerPath(currentIssue.slug, 1)}?toc=1`);
        }
        onClose();
      },
    },
    {
      id: "act-soundscape-on",
      section: "Actions",
      title: "Enable Focus Soundscape",
      subtitle: "Play a soft synthesized vinyl and room tone",
      badge: "Audio",
      action: () => {
        void startFocusSoundscape(getSoundscapePreference().volume);
        onClose();
      },
    },
    {
      id: "act-soundscape-off",
      section: "Actions",
      title: "Mute Soundscape",
      subtitle: "Stop the focus ambience",
      badge: "Mute",
      action: () => {
        stopFocusSoundscape();
        onClose();
      },
    },
  ], [
    location.pathname,
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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" onClick={onClose}>
          <Dialog.Content
            className="command-palette-card"
            aria-modal="true"
            aria-describedby={undefined}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            onEscapeKeyDown={(event) => {
              // The existing keyboard handler owns Escape dismissal.
              event.preventDefault();
            }}
            onOpenAutoFocus={() => {
              opener.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = opener.current?.isConnected
                ? opener.current
                : document.getElementById("main");
              target?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
        <div className="palette-input-wrap">
          <Icon name="search" size={20} className="palette-search-icon" />
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
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
