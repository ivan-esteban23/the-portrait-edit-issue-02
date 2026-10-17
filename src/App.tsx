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
    </div>
  );
}
