import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { currentIssue, readerPath } from "./content/issues";
import { useTheme, type Theme } from "./hooks/useTheme";
import { usePageMeta } from "./hooks/usePageMeta";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutsModal } from "./components/ShortcutsModal";

const Home = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.Home })),
);
const IssueOverview = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.IssueOverview })),
);
const Archive = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.Archive })),
);
const StudyPage = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.StudyPage })),
);
const About = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.About })),
);
const NotFound = lazy(() =>
  import("./components/SitePages").then((m) => ({ default: m.NotFound })),
);
const Reader = lazy(() =>
  import("./components/Reader").then((m) => ({ default: m.Reader })),
);

export default function App() {
  const { theme, setTheme } = useTheme();
  const location = useLocation(),
    navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [focus, setFocusState] = useState(() => {
    try {
      return localStorage.getItem("portrait-edit-focus-mode") === "true";
    } catch {
      return false;
    }
  });

  const setFocus = useCallback((value: boolean) => {
    setFocusState(value);
    try {
      localStorage.setItem("portrait-edit-focus-mode", String(value));
    } catch {
      /* Private browsing still works. */
    }
  }, []);

  const readerRoute = /^\/issues\/[^/]+\/pages\/\d+\/?$/.test(
    location.pathname,
  );
  const focused = readerRoute && focus;

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const cycleTheme = useCallback(() => {
    const nextTheme: Theme =
      theme === "system"
        ? "light"
        : theme === "light"
          ? "paper"
          : theme === "paper"
            ? "dark"
            : "system";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const toggleSpreadAction = useCallback(() => {
    try {
      const cur = localStorage.getItem("portrait-edit-spread") === "true";
      localStorage.setItem("portrait-edit-spread", String(!cur));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "portrait-edit-spread",
          newValue: String(!cur),
        }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFocusAction = useCallback(() => {
    setFocus(!focus);
  }, [focus, setFocus]);

  useEffect(() => {
    const legacy = () => {
      const match = window.location.hash.match(/^#page=(\d+)$/);
      if (match)
        navigate(
          readerPath(
            currentIssue.slug,
            Math.min(currentIssue.pages, Math.max(1, Number(match[1]))),
          ) + window.location.search,
          { replace: true },
        );
    };
    window.addEventListener("hashchange", legacy);
    return () => window.removeEventListener("hashchange", legacy);
  }, [navigate]);

  usePageMeta();

  return (
    <div className={focused ? "publication focused" : "publication"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!focused && (
        <header className="masthead">
          <Link className="wordmark" to="/">
            The Portrait Edit<span>Independent portrait studies</span>
          </Link>
          <nav aria-label="Publication">
            <button
              type="button"
              className="masthead-search-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              title="Search commands, pages, and prompts (⌘K / Ctrl+K)"
              aria-label="Search and command palette"
            >
              <svg
                width="15"
                height="15"
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
              <span className="search-trigger-label">
                <span className="search-label-long">Search</span>
                <span className="search-label-short">Find</span>
              </span>
              <kbd className="search-trigger-kbd">⌘K</kbd>
            </button>
            <Link to={`/issues/${currentIssue.slug}`}>Issue 02</Link>
            <Link to="/prompts">Archive</Link>
            <Link to="/about">About</Link>
            <div className="masthead-theme">
              <select
                aria-label="Color theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
              >
                <option value="system">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="paper">Paper</option>
              </select>
            </div>
          </nav>
        </header>
      )}
      <main id="main" tabIndex={-1}>
        <Suspense
          fallback={
            <p className="route-loading" role="status">
              Opening the archive…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/issues/:slug" element={<IssueOverview />} />
            <Route
              path="/issues/:slug/pages/:page"
              element={<Reader focus={focus} setFocus={setFocus} />}
            />
            <Route path="/prompts" element={<Archive />} />
            <Route path="/prompts/:id" element={<StudyPage />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!focused && (
        <footer className="site-footer">
          <div>
            <Link className="wordmark" to="/">
              The Portrait Edit
            </Link>
            <p>An independent editorial archive.</p>
          </div>
          <nav aria-label="Publication resources">
            <a href={currentIssue.pdfUrl}>Download Issue 02 PDF ↗</a>
            <a href={currentIssue.otherIssueUrl}>
              Issue 01 — The Fashion Issue ↗
            </a>
            <Link to={`/issues/${currentIssue.slug}`}>
              Issue 02 — The Prompt Issue
            </Link>
            <a href="https://github.com/ivan-esteban23/the-portrait-edit">
              Source & production notes ↗
            </a>
          </nav>
        </footer>
      )}

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        currentTheme={theme}
        onToggleTheme={cycleTheme}
        onToggleSpread={toggleSpreadAction}
        onToggleFocus={toggleFocusAction}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Global Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
