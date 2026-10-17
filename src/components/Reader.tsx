import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { assetUrl, chapterAt, issues, prompts, readerPath } from "@/content";
import { pageSchema, type Issue } from "@/content/schema";
import { editable } from "@/lib/utils";
import { useIdleChrome, useMedia, useSwipe } from "@/hooks/useReader";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Study } from "./Study";
import { NotFound } from "./SitePages";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { ImageLightbox } from "./ImageLightbox";
import { ShortcutsModal } from "./ShortcutsModal";

// BrowserRouter updates history before a transition finishes rendering. Read the
// latest address for consecutive gestures so rapid turns never reuse stale props.
function currentRoutePage(fallback: number) {
  const match = window.location.pathname.match(/\/pages\/(\d+)\/?$/);
  return match ? Number(match[1]) : fallback;
}
function currentRouteFocus(fallback: boolean) {
  const value = new URLSearchParams(window.location.search).get("focus");
  return value === "1" ? true : value === "0" ? false : fallback;
}

type ReaderProps = { focus: boolean; setFocus: (value: boolean) => void };
export function Reader(props: ReaderProps) {
  const { slug, page } = useParams();
  const issue = issues.find((i) => i.slug === slug);
  const n = Number(page);
  if (
    !issue ||
    !/^\d+$/.test(page ?? "") ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > issue.pages
  )
    return <NotFound />;
  return <ReaderView {...props} issue={issue} page={n} />;
}
function RawText({
  page,
  pdfUrl,
  pageDirectory,
}: {
  page: number;
  pdfUrl: string;
  pageDirectory: string;
}) {
  const [text, setText] = useState("Loading page text…");
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setText("Loading page text…");
    setError(false);
    fetch(assetUrl(`${pageDirectory}/${String(page).padStart(3, "0")}.json`), {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("Text unavailable");
        return r.json();
      })
      .then((data) => setText(pageSchema.parse(data).text))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(true);
          setText("Page text is unavailable.");
        }
      });
    return () => controller.abort();
  }, [page, pageDirectory]);
  return (
    <div className="raw-page">
      <pre>{text}</pre>
      {error && <a href={pdfUrl}>Download the PDF</a>}
    </div>
  );
}
function OriginalPage({
  page,
  issue,
  zoom,
  onInspect,
}: {
  page: number;
  issue: Issue;
  zoom: number;
  onInspect?: (page: number) => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  return (
    <div
      id="page-viewport"
      className="page-stage"
      aria-busy={state === "loading"}
    >
      {state === "loading" && (
        <>
          <div className="loading-line" aria-hidden="true" />
          <span className="sr-only" role="status">
            Loading page {page}
          </span>
        </>
      )}
      {state === "error" && (
        <div className="page-error" role="alert">
          <p>This page could not load.</p>
          <Button
            onClick={() => {
              setState("loading");
              setRetry((r) => r + 1);
            }}
          >
            Retry page
          </Button>
          <a href={issue.pdfUrl}>Download PDF</a>
        </div>
      )}
      <div
        className="page-holder"
        style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? "950px" : "none" }}
      >
        <img
          key={retry}
          className={state === "ready" ? "page-art loaded" : "page-art"}
          src={assetUrl(
            `${issue.pageDirectory}/${String(page).padStart(3, "0")}.webp${retry ? `?retry=${retry}` : ""}`,
          )}
          width="1224"
          height="1584"
          decoding="async"
          fetchPriority="high"
          alt={`Issue ${issue.number}, page ${page}`}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          onClick={() => onInspect?.(page)}
          title="Click to inspect page in detail"
          style={{ cursor: "zoom-in" }}
        />
      </div>
    </div>
  );
}
function SpreadPage({
  leftPage,
  rightPage,
  issue,
  zoom,
  onInspect,
}: {
  leftPage: number;
  rightPage: number;
  issue: Issue;
  zoom: number;
  onInspect: (page: number) => void;
}) {
  return (
    <div id="page-viewport" className="page-stage spread-stage">
      <div
        className="spread-holder"
        style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? "1700px" : "none" }}
      >
        <div className="spread-leaf spread-left">
          <OriginalPage
            page={leftPage}
            issue={issue}
            zoom={100}
            onInspect={onInspect}
          />
        </div>
        <div className="spread-spine" aria-hidden="true" />
        {rightPage <= issue.pages && (
          <div className="spread-leaf spread-right">
            <OriginalPage
              page={rightPage}
              issue={issue}
              zoom={100}
              onInspect={onInspect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
function ReaderView({
  issue,
  page,
  focus,
  setFocus,
}: ReaderProps & { issue: Issue; page: number }) {
  const location = useLocation(),
    navigate = useNavigate();
  const small = useMedia("(max-width: 767px)"),
    desktop = useMedia("(min-width: 1101px)");
  const [mode, setMode] = useState<"page" | "text">(() =>
    window.matchMedia("(max-width: 767px)").matches ? "text" : "page",
  );
  const { theme, setTheme } = useTheme();
  const spreadCapable = useMedia("(min-width: 1150px)");
  const [spread, setSpreadState] = useState(() => {
    try {
      return localStorage.getItem("portrait-edit-spread") === "true";
    } catch {
      return false;
    }
  });
  const setSpread = useCallback((val: boolean) => {
    setSpreadState(val);
    try {
      localStorage.setItem("portrait-edit-spread", String(val));
    } catch {
      /* private mode */
    }
  }, []);
  const isSpread = spreadCapable && spread && mode === "page";
  const [zoom, setZoom] = useState(100),
    [size, setSize] = useState(16),
    [settings, setSettings] = useState(false);
  const [preview, setPreview] = useState(page),
    [input, setInput] = useState(String(page));
  const [rawOpen, setRawOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [turning, setTurning] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const activeChapter = useRef<HTMLButtonElement>(null);
  const strip = useRef<HTMLElement>(null);
  const idle = useIdleChrome(focus && desktop && !settings);
  const chapter = chapterAt(issue, page),
    study = prompts.find((p) => p.issueSlug === issue.slug && p.page === page);
  const handleInspect = useCallback(
    (targetPage: number) => {
      setLightbox({
        src: assetUrl(
          `${issue.pageDirectory}/${String(targetPage).padStart(3, "0")}.webp`,
        ),
        alt: `Issue ${issue.number}, page ${targetPage}`,
        title: `Issue ${issue.number} · Page ${targetPage}`,
      });
    },
    [issue],
  );
  const step = isSpread ? 2 : 1;
  const leftPage = page % 2 === 0 ? page : page === 1 ? 1 : page - 1;
  const rightPage = leftPage + 1;
  const go = useCallback(
    (n: number) => {
      const target = Math.max(1, Math.min(issue.pages, Math.round(n) || 1));
      if (target !== page && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          /* ignore */
        }
      }
      setSettings(false);
      navigate(readerPath(issue.slug, target) + window.location.search, {
        replace: true,
      });
    },
    [issue, navigate, page],
  );
  const toggleFocus = useCallback(
    (next: boolean) => {
      // Apply the URL and persisted state in one sequence via the effect below.
      const search = new URLSearchParams(window.location.search);
      search.set("focus", next ? "1" : "0");
      navigate(
        readerPath(issue.slug, currentRoutePage(page)) +
          "?" +
          search.toString(),
        { replace: true },
      );
    },
    [navigate, issue.slug, page],
  );
  useEffect(() => {
    const value = new URLSearchParams(location.search).get("focus");
    if (value === "1" || value === "0") setFocus(value === "1");
  }, [location.search, setFocus]);
  useEffect(() => {
    setPreview(page);
    setInput(String(page));
    document.title = `Page ${page} · ${issue.title} — The Portrait Edit`;
  }, [page, issue.title]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    canvas.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    // A page turn starts the next article at its beginning without stealing
    // keyboard focus from the pager, slider, or docked navigation.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, issue.slug]);
  useEffect(() => {
    // Only the immediate neighbors are warmed, never a chapter or the whole issue.
    const images = [page - 1, page + 1]
      .filter((n) => n >= 1 && n <= issue.pages)
      .map((n) => {
        const img = new Image();
        img.fetchPriority = "low";
        img.decoding = "async";
        img.src = assetUrl(
          `${issue.pageDirectory}/${String(n).padStart(3, "0")}.webp`,
        );
        return img;
      });
    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [page, issue.pages, issue.pageDirectory]);
  useEffect(() => {
    const button = activeChapter.current,
      bar = strip.current;
    if (!button || !bar) return;
    const b = button.getBoundingClientRect(),
      s = bar.getBoundingClientRect();
    if (b.left < s.left) bar.scrollLeft -= s.left - b.left + 12;
    else if (b.right > s.right) bar.scrollLeft += b.right - s.right + 12;
  }, [chapter.title]);
  useEffect(() => {
    setTurning(true);
    const t = setTimeout(() => setTurning(false), 150);
    return () => clearTimeout(t);
  }, [page]);
  useEffect(() => {
    if (showThumbnails && filmstripRef.current) {
      const activeEl = filmstripRef.current.querySelector<HTMLElement>(
        ".filmstrip-thumb-btn.is-active",
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [page, showThumbnails]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (editable(e.target) || e.altKey || e.ctrlKey || e.metaKey || settings)
        return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }

      if (e.key === "Escape") {
        if (shortcutsOpen) {
          e.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (currentRouteFocus(focus)) {
          e.preventDefault();
          toggleFocus(false);
          return;
        }
      }

      const k = e.key.toLowerCase();
      if (k === "f" && !e.repeat) {
        e.preventDefault();
        toggleFocus(!currentRouteFocus(focus));
      }
      if (k === "t" && !e.repeat) {
        e.preventDefault();
        setMode((m) => (m === "page" ? "text" : "page"));
      }
      if (k === "s" && !e.repeat && spreadCapable) {
        e.preventDefault();
        setSpread(!spread);
      }
      if (k === "m" && !e.repeat) {
        e.preventDefault();
        const nextTheme =
          theme === "system"
            ? "light"
            : theme === "light"
              ? "paper"
              : theme === "paper"
                ? "dark"
                : "system";
        setTheme(nextTheme);
      }
      if (["ArrowRight", "j", "J"].includes(e.key)) {
        e.preventDefault();
        go(currentRoutePage(page) + step);
      }
      if (["ArrowLeft", "k", "K"].includes(e.key)) {
        e.preventDefault();
        go(currentRoutePage(page) - step);
      }
      if (e.key === "Home") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "End") {
        e.preventDefault();
        go(issue.pages);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [
    page,
    issue.pages,
    focus,
    settings,
    go,
    toggleFocus,
    step,
    shortcutsOpen,
    spreadCapable,
    theme,
    setTheme,
  ]);
  useSwipe(
    canvas,
    (delta) => go(currentRoutePage(page) + delta * step),
    mode === "text" || zoom === 100,
  );
  const openSettings = (open: boolean) => {
    setSettings(open);
    if (open) {
      try {
        if (!localStorage.getItem("portrait-edit-keys-hint")) {
          setHint(true);
          localStorage.setItem("portrait-edit-keys-hint", "shown");
        }
      } catch {
        setHint(true);
      }
    }
  };
  const commit = () => go(Number(preview));
  return (
    <section
      className={`reader ${focus ? "is-focus" : ""} ${idle ? "chrome-idle" : ""}`}
      aria-label="Magazine reader"
    >
      <div
        className="reading-progress-bar"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={page}
        aria-valuemin={1}
        aria-valuemax={issue.pages}
        style={{ width: `${(page / issue.pages) * 100}%` }}
      />
      <header className="reader-top">
        <div className="reader-controls">
          <Link className="reader-issue" to={`/issues/${issue.slug}`}>
            Issue {issue.number}
          </Link>
          {!small && (
            <label className="chapter-control">
              <span className="sr-only">Chapter</span>
              <select
                aria-label="Chapter"
                value={chapter.startPage}
                onChange={(e) => go(Number(e.target.value))}
              >
                <option value="1">Front matter (p. 1)</option>
                {issue.chapters.map((c) => (
                  <option key={c.startPage} value={c.startPage}>
                    {c.title} (p. {c.startPage})
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="pager" role="group" aria-label="Page navigation">
            <Button
              className="top-turn"
              variant="ghost"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => go(currentRoutePage(page) - step)}
            >
              ←
            </Button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(Number(input));
              }}
            >
              <input
                aria-label="Page number"
                type="number"
                inputMode="numeric"
                min={1}
                max={issue.pages}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onBlur={() => {
                  if (Number(input) !== page) go(Number(input));
                }}
              />
              <span>/ {issue.pages}</span>
            </form>
            <Button
              className="top-turn"
              variant="ghost"
              aria-label="Next page"
              disabled={page === issue.pages}
              onClick={() => go(currentRoutePage(page) + step)}
            >
              →
            </Button>
          </div>
          <Dialog open={settings} onOpenChange={openSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost">Display</Button>
            </DialogTrigger>
            <DialogContent>
              <div className="settings-grid">
                <label>
                  Theme
                  <select
                    aria-label="Color theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                  >
                    <option value="system">System (default)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="paper">Warm Paper / Sepia</option>
                  </select>
                </label>
                <label>
                  Chapter
                  <select
                    aria-label="Jump to chapter"
                    value={chapter.startPage}
                    onChange={(e) => go(Number(e.target.value))}
                  >
                    <option value="1">Front matter</option>
                    {issue.chapters.map((c) => (
                      <option key={c.startPage} value={c.startPage}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  View
                  <select
                    aria-label="Reading mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "page" | "text")}
                  >
                    <option value="page">Original page</option>
                    <option value="text">Reading view</option>
                  </select>
                </label>
                {mode === "page" ? (
                  <>
                    <label>
                      Zoom
                      <select
                        aria-label="Zoom"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                      >
                        {[100, 125, 150, 200].map((n) => (
                          <option key={n} value={n}>
                            {n === 100 ? "Fit" : `${n}%`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className={`spread-toggle-row ${!spreadCapable ? "is-disabled" : ""}`}
                    >
                      <span>Two-page spread</span>
                      <input
                        type="checkbox"
                        aria-label="Two-page spread"
                        checked={spread && spreadCapable}
                        disabled={!spreadCapable}
                        onChange={(e) => setSpread(e.target.checked)}
                      />
                      {!spreadCapable && (
                        <small className="control-note">
                          Available on screens 1150px+
                        </small>
                      )}
                    </label>
                  </>
                ) : (
                  <fieldset>
                    <legend>Text size</legend>
                    <div className="text-stepper">
                      {[16, 18, 20].map((n) => (
                        <Button
                          key={n}
                          aria-pressed={size === n}
                          onClick={() => setSize(n)}
                        >
                          {n} px
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
              <div className="keyboard-guide">
                <h3>Keyboard</h3>
                <p>
                  ← / K previous · → / J next
                  <br />
                  Home / End first and last page
                  <br />F Focus · Escape exit Focus
                </p>
                {hint && (
                  <p className="keys-hint">
                    Use ← → arrow keys to turn pages{" "}
                    <Button
                      variant="ghost"
                      aria-label="Dismiss keyboard shortcut hint"
                      onClick={() => setHint(false)}
                    >
                      ×
                    </Button>
                  </p>
                )}
              </div>
              <a href={issue.pdfUrl}>Download original PDF ↗</a>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            className="focus-button"
            aria-pressed={focus}
            aria-keyshortcuts="F"
            onClick={() => toggleFocus(!currentRouteFocus(focus))}
          >
            {focus ? "Exit Focus" : "Focus"}
          </Button>
          <Button
            variant="ghost"
            className="shortcuts-trigger-btn"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            onClick={() => setShortcutsOpen(true)}
          >
            ?
          </Button>
        </div>
        <p className="chapter-progress" aria-live="polite">
          {chapter.title}{" "}
          <span>
            · {page - chapter.startPage + 1} of{" "}
            {chapter.endPage - chapter.startPage + 1}
          </span>
        </p>
      </header>
      <nav ref={strip} className="chapter-strip" aria-label="Chapter overview">
        {issue.chapters.map((c) => (
          <button
            key={c.title}
            ref={c.title === chapter.title ? activeChapter : null}
            aria-current={c.title === chapter.title ? "location" : undefined}
            onClick={() => go(c.startPage)}
            style={
              {
                "--chapter-progress": `${(100 * (page - c.startPage + 1)) / (c.endPage - c.startPage + 1)}%`,
              } as CSSProperties
            }
          >
            {c.title}
            <span>
              {c.startPage}–{c.endPage}
            </span>
          </button>
        ))}
      </nav>
      <div
        ref={canvas}
        className={`reader-canvas ${turning ? "page-turn-anim" : ""}`}
        tabIndex={-1}
        aria-label={
          mode === "text" ? "Study reading view" : "Original page canvas"
        }
        style={{ "--reading-size": `${size}px` } as CSSProperties}
      >
        {mode === "page" ? (
          isSpread ? (
            <SpreadPage
              key={`${leftPage}-${rightPage}`}
              leftPage={leftPage}
              rightPage={rightPage}
              issue={issue}
              zoom={zoom}
              onInspect={handleInspect}
            />
          ) : (
            <OriginalPage
              key={page}
              page={page}
              issue={issue}
              zoom={zoom}
              onInspect={handleInspect}
            />
          )
        ) : study ? (
          <Study key={study.id} prompt={study} />
        ) : (
          <>
            {page === 1 && (
              <img
                className="reading-cover"
                src={assetUrl(issue.cover)}
                alt={`${issue.title} cover`}
              />
            )}
            <RawText
              key={page}
              page={page}
              pdfUrl={issue.pdfUrl}
              pageDirectory={issue.pageDirectory}
            />
          </>
        )}
      </div>
      <div className="scrubber">
        <div className="scrubber-header">
          <div className="scrubber-label">
            <label htmlFor="page-range">Browse the issue</label>
            <output htmlFor="page-range" aria-live="off">
              Page {preview} of {issue.pages}
            </output>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="filmstrip-toggle-btn"
            aria-expanded={showThumbnails}
            aria-label="Toggle page thumbnails"
            onClick={() => setShowThumbnails((v) => !v)}
          >
            {showThumbnails ? "Hide thumbnails" : "Thumbnails"}
          </Button>
        </div>
        {showThumbnails && (
          <div
            ref={filmstripRef}
            className="thumbnails-filmstrip-drawer"
            role="region"
            aria-label="Thumbnails filmstrip"
          >
            <div className="filmstrip-scroll">
              {Array.from({ length: issue.pages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`filmstrip-thumb-btn ${pNum === page ? "is-active" : ""}`}
                  aria-label={`Jump to page ${pNum}`}
                  aria-current={pNum === page ? "page" : undefined}
                  onClick={() => go(pNum)}
                >
                  <img
                    src={assetUrl(
                      `${issue.pageDirectory}/${String(pNum).padStart(3, "0")}.webp`,
                    )}
                    alt={`Page ${pNum}`}
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={72}
                  />
                  <span className="filmstrip-thumb-number">{pNum}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="range-track">
          <input
            id="page-range"
            aria-label="Browse pages"
            type="range"
            min={1}
            max={issue.pages}
            value={preview}
            aria-valuetext={`Page ${preview} of ${issue.pages}`}
            onChange={(e) => setPreview(Number(e.target.value))}
            onPointerUp={(e) => {
              go(Number(e.currentTarget.value));
            }}
            onPointerCancel={() => setPreview(page)}
            onKeyUp={(e) => {
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(e.key)
              )
                commit();
            }}
            onBlur={() => {
              if (preview !== page) commit();
            }}
          />
          <div className="chapter-ticks" aria-hidden="true">
            {issue.chapters.map((c) => (
              <i
                key={c.startPage}
                style={{
                  left: `${(100 * (c.startPage - 1)) / (issue.pages - 1)}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="quick-steps">
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => go(currentRoutePage(page) - 10)}
          >
            −10 pages
          </Button>
          <span>Marks show chapter openings</span>
          <Button
            variant="ghost"
            disabled={page === issue.pages}
            onClick={() => go(currentRoutePage(page) + 10)}
          >
            +10 pages
          </Button>
        </div>
      </div>
      {mode === "page" && !focus && (
        <details
          className="extracted-text"
          onToggle={(e) => setRawOpen(e.currentTarget.open)}
        >
          <summary>Read this page as text</summary>
          {rawOpen && (
            <RawText
              page={page}
              pdfUrl={issue.pdfUrl}
              pageDirectory={issue.pageDirectory}
            />
          )}
        </details>
      )}
      <nav className="reader-bottom" aria-label="Bottom page navigation">
        <Button
          variant="ghost"
          disabled={page === 1}
          onClick={() => go(currentRoutePage(page) - step)}
        >
          ← Previous
        </Button>
        <span aria-live="polite">
          {page} / {issue.pages}
        </span>
        <Button
          variant="ghost"
          disabled={page === issue.pages}
          onClick={() => go(currentRoutePage(page) + step)}
        >
          Next →
        </Button>
      </nav>
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          title={lightbox.title}
          isOpen={Boolean(lightbox)}
          onClose={() => setLightbox(null)}
        />
      )}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </section>
  );
}
