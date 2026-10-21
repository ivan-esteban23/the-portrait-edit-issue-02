import { Icon } from "@/components/ui/Icon";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { currentIssue, readerPath } from "./content/issues";
import { useTheme, type Theme } from "./hooks/useTheme";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toast } from "./components/ui/Toast";
import { BOOKMARK_REMOVED, useBookmarks } from "./hooks/useBookmarks";
import { useLanguage } from "./i18n/LanguageProvider";

const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const ShortcutsModal = lazy(() =>
  import("./components/ShortcutsModal").then((m) => ({
    default: m.ShortcutsModal,
  })),
);

const Home = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const IssueOverview = lazy(() =>
  import("./pages/IssueOverviewPage").then((m) => ({
    default: m.IssueOverviewPage,
  })),
);
const Archive = lazy(() =>
  import("./pages/ArchivePage").then((m) => ({ default: m.ArchivePage })),
);
const StudyPage = lazy(() =>
  import("./pages/StudyPage").then((m) => ({ default: m.StudyPage })),
);
const About = lazy(() =>
  import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const NotFound = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const Reader = lazy(() =>
  import("./components/Reader").then((m) => ({ default: m.Reader })),
);

export default function App() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const location = useLocation(),
    navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<{
    id: string;
    collection: string;
    token: number;
  } | null>(null);
  const { restoreSaved } = useBookmarks();

  useEffect(() => {
    const handleBookmarkRemoved = (event: Event) => {
      const { id, collection } = (
        event as CustomEvent<{ id: string; collection: string }>
      ).detail;
      setBookmarkToast((previous) => ({
        id,
        collection,
        token: (previous?.token ?? 0) + 1,
      }));
    };
    window.addEventListener(BOOKMARK_REMOVED, handleBookmarkRemoved);
    return () =>
      window.removeEventListener(BOOKMARK_REMOVED, handleBookmarkRemoved);
  }, []);

  const dismissBookmarkToast = useCallback(() => setBookmarkToast(null), []);
  const undoBookmarkRemoval = useCallback(() => {
    if (bookmarkToast) {
      restoreSaved(bookmarkToast.id, bookmarkToast.collection);
      setBookmarkToast(null);
    }
  }, [bookmarkToast, restoreSaved]);

  const [focus, setFocusState] = useState(() => {
    try {
      return localStorage.getItem("portrait-edit-focus-mode") === "true";
    } catch {
      return false;
    }
  });

  const locationRef = useRef(location);
  locationRef.current = location;
  // Single Focus transition: state, persisted preference and an existing
  // ?focus= parameter always change together, so a refresh never reverts it.
  const setFocus = useCallback(
    (value: boolean) => {
      setFocusState(value);
      try {
        localStorage.setItem("portrait-edit-focus-mode", String(value));
      } catch {
        /* Private browsing still works. */
      }
      const search = new URLSearchParams(locationRef.current.search);
      const current = search.get("focus");
      if (current !== null && current !== (value ? "1" : "0")) {
        search.set("focus", value ? "1" : "0");
        navigate(
          {
            pathname: locationRef.current.pathname,
            search: `?${search.toString()}`,
            hash: locationRef.current.hash,
          },
          { replace: true },
        );
      }
    },
    [navigate],
  );

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
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const toggleSpreadAction = useCallback(() => {
    try {
      const cur = localStorage.getItem("portrait-edit-spread") === "true";
      const next = !cur;
      localStorage.setItem("portrait-edit-spread", String(next));
      window.dispatchEvent(
        new CustomEvent("spread-toggle-change", {
          detail: { spread: next },
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

  return (
    <div className={focused ? "publication focused" : "publication"}>
      <a className="skip-link" href="#main">
        {t("Skip to content")}
      </a>
      {!focused && (
        <header className="masthead">
          <Link className="wordmark" to="/">
            THE PORTRAIT EDIT — ISSUE 02
            <span>{t("Independent portrait studies")}</span>
          </Link>
          <nav aria-label="Publication">
            <button
              type="button"
              className="masthead-search-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              title={t("Search commands, pages, and prompts (⌘K / Ctrl+K)")}
              aria-label={t("Search and command palette")}
            >
              <Icon name="search" size={15} />
              <span className="search-trigger-label">
                <span className="search-label-long">{t("Search")}</span>
                <span className="search-label-short">{t("Find")}</span>
              </span>
              <kbd className="search-trigger-kbd">⌘K</kbd>
            </button>
            <NavLink
              to={readerPath(currentIssue.slug, 1)}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {t("Reader")}
            </NavLink>
            <NavLink
              to="/prompts"
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {t("Archive")}
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {t("About")}
            </NavLink>
            <div className="masthead-theme">
              <button
                type="button"
                className="masthead-theme-toggle"
                aria-label={`Color theme: ${theme}. Activate to change theme`}
                title={`Color theme: ${theme}`}
                onClick={cycleTheme}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
              </button>
            </div>
          </nav>
        </header>
      )}
      <main id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <p className="route-loading" role="status">
                {t("Opening the archive…")}
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
        </ErrorBoundary>
      </main>
      {!focused && (
        <footer className="site-footer">
          <div>
            <Link className="wordmark" to="/">
              The Portrait Edit
            </Link>
            <p>{t("An independent editorial archive.")}</p>
          </div>
          <nav aria-label="Publication resources">
            <a href={currentIssue.pdfUrl}>{t("Download Issue 02 PDF ↗")}</a>
            <a href={currentIssue.otherIssueUrl}>
              {t("Issue 01 — The Fashion Issue ↗")}
            </a>
            <Link to={`/issues/${currentIssue.slug}`}>
              {t("Issue 02 — The Prompt Issue")}
            </Link>
            <a href="https://github.com/ivan-esteban23/the-portrait-edit">
              {t("Source & production notes ↗")}
            </a>
          </nav>
        </footer>
      )}

      <Toast
        key={bookmarkToast?.token ?? "bookmark-toast"}
        message={t("Study removed from {collection}", { collection: bookmarkToast?.collection ?? t("collection") })}
        visible={Boolean(bookmarkToast)}
        onUndo={undoBookmarkRemoval}
        onDismiss={dismissBookmarkToast}
      />

      {/* Global Command Palette */}
      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            currentTheme={theme}
            onToggleTheme={cycleTheme}
            onToggleSpread={toggleSpreadAction}
            onToggleFocus={toggleFocusAction}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        </Suspense>
      )}

      {/* Global Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal
            isOpen={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
