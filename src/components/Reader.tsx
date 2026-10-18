import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { assetUrl, chapterAt, issues, prompts, readerPath } from "@/content";
import { pageSchema, type Issue } from "@/content/schema";
import { editable, lightHaptic } from "@/lib/utils";
import { useIdleChrome, useMedia, useSwipe } from "@/hooks/useReader";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Study } from "./Study";
import { NotFound } from "./SitePages";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { useBookmarks } from "@/hooks/useBookmarks";
import { saveReadingProgress } from "@/hooks/useReadingProgress";
import { useSoundEffect } from "@/utils/audio";

const ImageLightbox = lazy(() =>
  import("./ImageLightbox").then((m) => ({ default: m.ImageLightbox })),
);
const ShortcutsModal = lazy(() =>
  import("./ShortcutsModal").then((m) => ({ default: m.ShortcutsModal })),
);

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
    <div className="page-stage" aria-busy={state === "loading"}>
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
          role="button"
          tabIndex={0}
          aria-label={`Inspect page ${page} in detail`}
          onClick={(event) => {
            event.currentTarget.focus();
            onInspect?.(page);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onInspect?.(page);
            }
          }}
          style={{ cursor: "zoom-in" }}
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
          title="Click to inspect page in detail"
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
    <div className="page-stage spread-stage">
      <div
        className="spread-holder"
        style={{
          width: `${zoom}%`,
          maxWidth: zoom === 100 ? "1700px" : "none",
        }}
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
  const docked = useMedia("(max-width: 1100px)");
  const small = useMedia("(max-width: 767px)"),
    desktop = useMedia("(min-width: 1101px)");
  const [mode, setMode] = useState<"page" | "text">(() =>
    window.matchMedia("(max-width: 767px)").matches ? "text" : "page",
  );
  const { theme, setTheme } = useTheme();
  const { isSaved, toggleSaved } = useBookmarks();
  useEffect(() => saveReadingProgress(issue.slug, page), [issue.slug, page]);
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
  useEffect(() => {
    const syncSpread = (event: StorageEvent) => {
      if (event.key === "portrait-edit-spread") {
        setSpreadState(event.newValue === "true");
      }
    };
    window.addEventListener("storage", syncSpread);
    return () => window.removeEventListener("storage", syncSpread);
  }, []);
  // Keep the cover in single-page mode even when spreads are enabled.
  const isSpread = spreadCapable && spread && mode === "page" && page > 1;
  const [nativeZoomed, setNativeZoomed] = useState(
    () => (window.visualViewport?.scale ?? 1) > 1,
  );
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncZoom = () => setNativeZoomed(viewport.scale > 1);
    syncZoom();
    viewport.addEventListener("resize", syncZoom);
    return () => viewport.removeEventListener("resize", syncZoom);
  }, []);
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
  const [showTouchHint, setShowTouchHint] = useState(false);
  const touchHintDismissed = useRef(false);

  useEffect(() => {
    try {
      const isTouch =
        typeof window !== "undefined" &&
        ("ontouchstart" in window ||
          (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));
      const dismissed = localStorage.getItem("portrait-edit-touch-hint");
      if (isTouch && !dismissed) {
        setShowTouchHint(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismissTouchHint = useCallback(() => {
    if (touchHintDismissed.current) return;
    touchHintDismissed.current = true;
    setShowTouchHint(false);
    try {
      localStorage.setItem("portrait-edit-touch-hint", "dismissed");
    } catch {
      /* ignore */
    }
  }, []);

  const { soundEnabled, toggleSound, playPaperTurn } = useSoundEffect();
  const isInitialPageRender = useRef(true);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const bottomNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = bottomNav.current;
    if (!node || !docked) return;
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue(
      "--reader-bottom-height",
    );
    const measure = () =>
      root.style.setProperty(
        "--reader-bottom-height",
        `${node.getBoundingClientRect().height}px`,
      );
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(node, { box: "border-box" });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previousHeight)
        root.style.setProperty("--reader-bottom-height", previousHeight);
      else root.style.removeProperty("--reader-bottom-height");
    };
  }, [docked]);
  const activeChapter = useRef<HTMLButtonElement>(null);
  const strip = useRef<HTMLElement>(null);
  const idle = useIdleChrome(focus && desktop && !settings);
  const chapter = chapterAt(issue, page);
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
  // Even pages are left (verso), odd pages are right (recto): [2, 3], [4, 5], ...
  const leftPage = page % 2 === 0 ? page : page - 1;
  const rightPage = leftPage + 1;
  const firstVisible = isSpread ? leftPage : page;
  const lastVisible = isSpread ? Math.min(rightPage, issue.pages) : page;
  const study =
    prompts.find((p) => p.issueSlug === issue.slug && p.page === page) ??
    prompts.find(
      (p) =>
        p.issueSlug === issue.slug &&
        p.page >= firstVisible &&
        p.page <= lastVisible,
    );
  const pageLabel =
    firstVisible === lastVisible
      ? String(firstVisible)
      : `${firstVisible}–${lastVisible}`;
  const [announcement, setAnnouncement] = useState("");
  const toggleStudyBookmark = useCallback(() => {
    if (!study) return;
    const saved = isSaved(study.id);
    toggleSaved(study.id);
    lightHaptic();
    setAnnouncement(
      `Study ${String(study.studyNumber).padStart(3, "0")} ${saved ? "removed from saved bookmarks" : "saved to bookmarks"}.`,
    );
  }, [study, isSaved, toggleSaved]);
  const announced = useRef<{ pageKey: string; focus: boolean } | null>(null);
  useEffect(() => {
    const pageKey = `${issue.slug}:${firstVisible}:${lastVisible}`;
    const messages: string[] = [];
    if (announced.current?.pageKey !== pageKey) {
      const titleAt = (number: number) => {
        const prompt = prompts.find(
          (p) => p.issueSlug === issue.slug && p.page === number,
        );
        return prompt
          ? `Study ${String(prompt.studyNumber).padStart(3, "0")} - ${prompt.title}`
          : number === 1
            ? `${issue.title} cover`
            : chapterAt(issue, number).title;
      };
      messages.push(
        firstVisible === lastVisible
          ? `Page ${firstVisible} of ${issue.pages}: ${titleAt(firstVisible)}`
          : `Pages ${firstVisible} and ${lastVisible} of ${issue.pages}: ${titleAt(firstVisible)} and ${titleAt(lastVisible)}`,
      );
    }
    if (announced.current && announced.current.focus !== focus) {
      messages.push(`Focus mode ${focus ? "activated" : "deactivated"}`);
    }
    announced.current = { pageKey, focus };
    if (messages.length) setAnnouncement(messages.join(". "));
  }, [firstVisible, lastVisible, focus, issue]);
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
  const getNextPage = useCallback(
    (curr: number) => {
      if (!spreadCapable || !spread || mode !== "page") {
        return Math.min(curr + 1, issue.pages);
      }
      if (curr === 1) return 2; // Move from solo cover to the first spread (pages 2 & 3)
      const next = curr % 2 === 0 ? curr + 2 : curr + 1;
      return Math.min(next, issue.pages);
    },
    [spreadCapable, spread, mode, issue.pages],
  );
  const getPrevPage = useCallback(
    (curr: number) => {
      if (!spreadCapable || !spread || mode !== "page") {
        return Math.max(curr - 1, 1);
      }
      if (curr <= 3) return 1; // Move from pages 2 or 3 back to solo cover
      return curr % 2 === 0 ? Math.max(curr - 2, 1) : Math.max(curr - 3, 1);
    },
    [spreadCapable, spread, mode],
  );
  const turnPage = useCallback(
    (delta: number) => {
      // Read the latest route so consecutive gestures never reuse a stale page.
      const current = currentRoutePage(page);
      go(delta > 0 ? getNextPage(current) : getPrevPage(current));
    },
    [go, getNextPage, getPrevPage, page],
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
    // A lazy-loaded reader must not steal focus from the skip link or another
    // control that the user reached while the route was loading.
    if (document.activeElement === document.body) {
      canvas.current?.focus({ preventScroll: true });
    }
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
    if (isInitialPageRender.current) {
      isInitialPageRender.current = false;
    } else {
      playPaperTurn();
    }
    return () => clearTimeout(t);
  }, [page, playPaperTurn]);
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
      if (
        e.defaultPrevented ||
        editable(e.target) ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        settings ||
        document.querySelector('[role="dialog"][aria-modal="true"]')
      )
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
      if (k === "b" && !e.repeat && study) {
        e.preventDefault();
        toggleStudyBookmark();
      }
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
        turnPage(1);
      }
      if (["ArrowLeft", "k", "K"].includes(e.key)) {
        e.preventDefault();
        turnPage(-1);
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
    turnPage,
    shortcutsOpen,
    spreadCapable,
    spread,
    theme,
    setTheme,
    study,
    toggleStudyBookmark,
  ]);
  useSwipe(
    canvas,
    (delta) => {
      dismissTouchHint();
      go(
        delta > 0
          ? getNextPage(currentRoutePage(page))
          : getPrevPage(currentRoutePage(page)),
      );
    },
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
        className="sr-only reader-announcer"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
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
              disabled={firstVisible === 1}
              onClick={() => turnPage(-1)}
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
              disabled={lastVisible === issue.pages}
              onClick={() => turnPage(1)}
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
                <label className="sound-toggle-row">
                  <span>Paper turn sound</span>
                  <input
                    type="checkbox"
                    aria-label="Paper turn sound (Web Audio)"
                    checked={soundEnabled}
                    onChange={toggleSound}
                  />
                </label>
              </div>
              <div className="keyboard-guide">
                <h3>Keyboard</h3>
                <p>
                  ← / K previous · → / J next
                  <br />
                  Home / End first and last page
                  <br />F Focus · Escape exit Focus
                  <br />B Bookmark / save current study
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
            className={`sound-fx-toggle-btn ${soundEnabled ? "is-active" : ""}`}
            aria-label={`Sound FX: ${soundEnabled ? "On" : "Off"}`}
            title={`Sound FX: ${soundEnabled ? "On" : "Off"}`}
            onClick={toggleSound}
          >
            {soundEnabled ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            <span className="sound-fx-label">
              {soundEnabled ? "Sound: On" : "Sound: Off"}
            </span>
          </Button>
          {study && (
            <Button
              variant="ghost"
              className={`reader-bookmark-btn ${isSaved(study.id) ? "is-saved" : ""}`}
              aria-label={
                isSaved(study.id)
                  ? "Remove study from saved bookmarks"
                  : "Save study to bookmarks"
              }
              aria-pressed={isSaved(study.id)}
              aria-keyshortcuts="B"
              title="Bookmark study (B)"
              onClick={toggleStudyBookmark}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isSaved(study.id) ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3h12v18l-6-4-6 4z" />
              </svg>
            </Button>
          )}
          <Button
            variant="ghost"
            className="shortcuts-trigger-btn"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            onClick={(event) => {
              event.currentTarget.focus();
              setShortcutsOpen(true);
            }}
          >
            ?
          </Button>
        </div>
        <p className="chapter-progress">
          {chapter.title}{" "}
          <span>
            · {page - chapter.startPage + 1} of{" "}
            {chapter.endPage - chapter.startPage + 1}
          </span>
        </p>
      </header>
      {showTouchHint && (
        <div
          className="touch-swipe-hint"
          role="status"
          aria-live="polite"
          aria-label="Swipe gesture hint"
        >
          <span className="touch-swipe-text">← Swipe to turn pages →</span>
          <button
            type="button"
            className="touch-swipe-dismiss"
            onClick={dismissTouchHint}
            aria-label="Dismiss swipe hint"
          >
            ×
          </button>
        </div>
      )}
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
        id="page-viewport"
        ref={canvas}
        data-zoomed={nativeZoomed || (mode === "page" && zoom > 100)}
        className={`reader-canvas ${turning ? "page-turn-anim" : ""}`}
        tabIndex={-1}
        aria-label={
          mode === "text" ? "Study reading view" : "Original page canvas"
        }
        style={{ "--reading-size": `${size}px` } as CSSProperties}
      >
        {mode === "page" ? (
          isSpread && rightPage <= issue.pages ? (
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
          <Study key={study.id} prompt={study} context="reader" />
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
              {Array.from({ length: issue.pages }, (_, i) => i + 1).map(
                (pNum) => (
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
                ),
              )}
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
            disabled={firstVisible === 1}
            onClick={() => go(currentRoutePage(page) - 10)}
          >
            −10 pages
          </Button>
          <span>Marks show chapter openings</span>
          <Button
            variant="ghost"
            disabled={lastVisible === issue.pages}
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
      <nav
        ref={bottomNav}
        className="reader-bottom"
        aria-label="Bottom page navigation"
      >
        <Button
          variant="ghost"
          disabled={firstVisible === 1}
          onClick={() => turnPage(-1)}
        >
          ← Previous
        </Button>
        <span>
          {pageLabel} / {issue.pages}
        </span>
        <Button
          variant="ghost"
          disabled={lastVisible === issue.pages}
          onClick={() => turnPage(1)}
        >
          Next →
        </Button>
      </nav>
      {lightbox && (
        <Suspense fallback={null}>
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            title={lightbox.title}
            isOpen={Boolean(lightbox)}
            onClose={() => setLightbox(null)}
          />
        </Suspense>
      )}
      {shortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal
            isOpen={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
}
