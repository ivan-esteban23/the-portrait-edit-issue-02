import { IconText } from "@/components/ui/IconText";
import { useSlideshow } from "@/hooks/useSlideshow";
import { useReaderKeyboard } from "@/hooks/useReaderKeyboard";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { ReaderToolbar } from "./reader/ReaderToolbar";
import { ReaderChapterDrawer } from "./reader/ReaderChapterDrawer";
import { ReaderScrubber } from "./reader/ReaderScrubber";
import {
  RawText,
  OriginalPage,
  SpreadPage,
  PageFallback,
  CoverFallback,
} from "./reader/ReaderPages";
import { ChapterOpener } from "./reader/ChapterOpener";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  assetUrl,
  chapterAt,
  issues,
  pageEyebrow,
  prompts,
  readerPath,
} from "@/content";
import type { Issue } from "@/content/schema";
import { lightHaptic } from "@/lib/utils";
import { useIdleChrome, useMedia } from "@/hooks/useReader";
import { Button } from "./ui/button";
import { Study } from "./Study";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { truncateMetaDescription, usePageMeta } from "@/hooks/usePageMeta";
import { useTheme } from "@/hooks/useTheme";
import { useBookmarks } from "@/hooks/useBookmarks";
import { saveReadingProgress } from "@/hooks/useReadingProgress";
import { useSoundEffect } from "@/utils/audio";
import {
  getSoundscapePreference,
  setSoundscapeVolume,
  startFocusSoundscape,
  stopFocusSoundscape,
  SOUNDSCAPE_CHANGE_EVENT,
} from "@/lib/soundscape";

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
    return <NotFoundPage />;
  return <ReaderView {...props} issue={issue} page={n} />;
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
    const syncSpreadCustom = (event: Event) => {
      const { spread } = (event as CustomEvent<{ spread: boolean }>).detail;
      setSpreadState(spread);
    };
    const syncSpreadStorage = (event: StorageEvent) => {
      if (event.key === "portrait-edit-spread") {
        setSpreadState(event.newValue === "true");
      }
    };
    window.addEventListener("spread-toggle-change", syncSpreadCustom);
    window.addEventListener("storage", syncSpreadStorage);
    return () => {
      window.removeEventListener("spread-toggle-change", syncSpreadCustom);
      window.removeEventListener("storage", syncSpreadStorage);
    };
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
  const [rawOpen, setRawOpen] = useState(false);
  const [turning, setTurning] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tableOfContentsOpen, setTableOfContentsOpen] = useState(
    () => new URLSearchParams(window.location.search).get("toc") === "1",
  );
  const [soundscape, setSoundscape] = useState(getSoundscapePreference);
  const soundscapeNeedsResume = useRef(soundscape.enabled);
  const [showTouchHint, setShowTouchHint] = useState(false);
  const touchHintDismissed = useRef(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined"
      ? Boolean(document.fullscreenElement)
      : false,
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
  useEffect(() => {
    const syncSoundscape = (event: Event) =>
      setSoundscape(
        (event as CustomEvent<{ enabled: boolean; volume: number }>).detail,
      );
    window.addEventListener(SOUNDSCAPE_CHANGE_EVENT, syncSoundscape);
    return () =>
      window.removeEventListener(SOUNDSCAPE_CHANGE_EVENT, syncSoundscape);
  }, []);
  useEffect(() => {
    if (!soundscapeNeedsResume.current) return;
    const resumeOnInteraction = () => {
      if (!soundscapeNeedsResume.current) return;
      soundscapeNeedsResume.current = false;
      void startFocusSoundscape(soundscape.volume);
    };
    window.addEventListener("pointerdown", resumeOnInteraction, { once: true });
    window.addEventListener("keydown", resumeOnInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resumeOnInteraction);
      window.removeEventListener("keydown", resumeOnInteraction);
    };
  }, [soundscape.volume]);
  useEffect(() => {
    const openIndex = () => setTableOfContentsOpen(true);
    window.addEventListener("reader:open-toc", openIndex);
    return () => window.removeEventListener("reader:open-toc", openIndex);
  }, []);
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (search.get("toc") !== "1") return;
    setTableOfContentsOpen(true);
    search.delete("toc");
    navigate(
      `${location.pathname}${search.size ? `?${search.toString()}` : ""}`,
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);
  const toggleSoundscape = useCallback(() => {
    soundscapeNeedsResume.current = false;
    if (soundscape.enabled) stopFocusSoundscape();
    else void startFocusSoundscape(soundscape.volume);
  }, [soundscape]);
  const isInitialPageRender = useRef(true);
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
  const chapterIndex = issue.chapters.findIndex((c) => c.startPage === page);
  const openerChapter =
    chapterIndex >= 0 &&
    issue.chapters[chapterIndex].intro &&
    issue.chapters[chapterIndex].featuredStudies?.length === 3
      ? issue.chapters[chapterIndex]
      : null;
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
  usePageMeta({
    title: `Page ${page} — ${chapter.title} | The Portrait Edit`,
    description: study
      ? truncateMetaDescription(study.prompt)
      : issue.description,
    image: assetUrl(study?.referenceImage ?? issue.cover),
    path: readerPath(issue.slug, page),
  });
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

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        const exit = document.exitFullscreen?.();
        if (exit && typeof exit.catch === "function") exit.catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        const req = document.documentElement.requestFullscreen();
        if (req && typeof req.catch === "function") req.catch(() => {});
      }
    } catch {
      /* fullscreen unsupported or denied in tests */
    }
    toggleFocus(!currentRouteFocus(focus));
  }, [focus, toggleFocus]);

  const {
    isPlaying,
    toggleSlideshow,
    slideshowSpeed,
    setSlideshowSpeed,
    loopSlideshow,
    setLoopSlideshow,
    slideshowProgress,
    isHoverPaused,
    setIsHoverPaused,
  } = useSlideshow({
    page,
    pageCount: issue.pages,
    getCurrentPage: () => currentRoutePage(page),
    onPageSelect: go,
    onAdvance: turnPage,
    onEnd: () => setAnnouncement("Reached end of issue"),
    paused:
      settings ||
      rawOpen ||
      shortcutsOpen ||
      tableOfContentsOpen ||
      Boolean(lightbox) ||
      showThumbnails,
  });
  useEffect(() => {
    const value = new URLSearchParams(location.search).get("focus");
    if (value === "1" || value === "0") setFocus(value === "1");
  }, [location.search, setFocus]);
  useEffect(() => {
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
  useReaderKeyboard({
    settings,
    shortcutsOpen,
    setTableOfContentsOpen,
    getFocus: () => currentRouteFocus(focus),
    toggleFocus,
    setShortcutsOpen,
    hasStudy: Boolean(study),
    toggleStudyBookmark,
    toggleSlideshow,
    toggleFullscreen,
    setMode,
    spreadCapable,
    spread,
    setSpread,
    theme,
    setTheme,
    turnPage,
    go,
    pageCount: issue.pages,
  });
  const swipeGestures = useSwipeGestures(
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
      <ReaderToolbar
        {...{
          issue,
          page,
          small,
          chapter,
          firstVisible,
          lastVisible,
          go,
          turnPage,
          settings,
          setSettings,
          theme,
          setTheme,
          mode,
          setMode,
          zoom,
          setZoom,
          spreadCapable,
          spread,
          setSpread,
          size,
          setSize,
          soundEnabled,
          toggleSound,
          soundscapeEnabled: soundscape.enabled,
          soundscapeVolume: soundscape.volume,
          onToggleSoundscape: toggleSoundscape,
          onSoundscapeVolumeChange: setSoundscapeVolume,
          onOpenTableOfContents: () => setTableOfContentsOpen(true),
          slideshowSpeed,
          setSlideshowSpeed,
          loopSlideshow,
          setLoopSlideshow,
          focus,
          isPlaying,
          toggleSlideshow,
          isFullscreen,
          toggleFullscreen,
          study,
          isSaved,
          toggleStudyBookmark,
          setShortcutsOpen,
        }}
        onToggleFocus={() => toggleFocus(!currentRouteFocus(focus))}
      />
      <ReaderChapterDrawer
        issue={issue}
        page={page}
        isOpen={tableOfContentsOpen}
        onClose={() => setTableOfContentsOpen(false)}
        onSelect={(target) => {
          setTableOfContentsOpen(false);
          go(target);
        }}
      />
      {showTouchHint && (
        <div
          className="touch-swipe-hint"
          role="status"
          aria-live="polite"
          aria-label="Swipe gesture hint"
        >
          <span className="touch-swipe-text">
            <IconText>← Swipe to turn pages →</IconText>
          </span>
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
                "--chapter-progress": `${Math.max(0, Math.min(100, (100 * (page - c.startPage + 1)) / (c.endPage - c.startPage + 1)))}%`,
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
        {...swipeGestures}
        data-zoomed={nativeZoomed || (mode === "page" && zoom > 100)}
        className={`reader-canvas ${turning ? "page-turn-anim" : ""}`}
        tabIndex={-1}
        aria-label={
          mode === "text" ? "Study reading view" : "Original page canvas"
        }
        style={{ "--reading-size": `${size}px` } as CSSProperties}
        onMouseEnter={() => {
          if (isPlaying) setIsHoverPaused(true);
        }}
        onMouseLeave={() => {
          setIsHoverPaused(false);
        }}
      >
        {isPlaying && (
          <div
            className="reader-slideshow-progress"
            role="progressbar"
            aria-label="Slideshow slide progress"
            aria-valuenow={Math.round(slideshowProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: `${slideshowProgress}%` }}
          />
        )}
        <div
          className={`reader-hover-paused-indicator ${isPlaying && isHoverPaused ? "is-visible" : ""}`}
          role="status"
          aria-hidden={!(isPlaying && isHoverPaused)}
        >
          Paused
        </div>
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
        ) : openerChapter ? (
          <ChapterOpener
            issue={issue}
            chapter={openerChapter}
            chapterIndex={chapterIndex}
            prompts={prompts}
            onInspect={handleInspect}
          />
        ) : page === 1 ? (
          <CoverFallback issue={issue} />
        ) : (
          <PageFallback
            page={page}
            issue={issue}
            label={pageEyebrow(issue, page)}
            onInspect={handleInspect}
          />
        )}
      </div>
      <ReaderScrubber
        {...{
          issue,
          page,
          firstVisible,
          lastVisible,
          go,
          showThumbnails,
          setShowThumbnails,
        }}
        getCurrentPage={() => currentRoutePage(page)}
      />
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
          <IconText>← Previous</IconText>
        </Button>
        <span>
          {pageLabel} / {issue.pages}
        </span>
        <Button
          variant="ghost"
          disabled={lastVisible === issue.pages}
          onClick={() => turnPage(1)}
        >
          <IconText>Next →</IconText>
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
