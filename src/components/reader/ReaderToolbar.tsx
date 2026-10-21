import { useEffect, useRef, useState } from "react";
import { useMedia } from "@/hooks/useReader";
import { Link } from "react-router-dom";
import type { Issue, Prompt } from "@/content/schema";
import type { Theme } from "@/hooks/useTheme";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import { readerPath } from "@/content";
import { CopyLinkButton } from "../CopyLinkButton";

interface ReaderToolbarProps {
  issue: Issue;
  page: number;
  small: boolean;
  chapter: Issue["chapters"][number];
  firstVisible: number;
  lastVisible: number;
  go: (page: number) => void;
  turnPage: (delta: number) => void;
  settings: boolean;
  setSettings: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: "page" | "text";
  setMode: (mode: "page" | "text") => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  spreadCapable: boolean;
  spread: boolean;
  setSpread: (spread: boolean) => void;
  size: number;
  setSize: (size: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  soundscapeEnabled: boolean;
  soundscapeVolume: number;
  onToggleSoundscape: () => void;
  onSoundscapeVolumeChange: (volume: number) => void;
  onOpenTableOfContents: () => void;
  slideshowSpeed: number;
  setSlideshowSpeed: (speed: number) => void;
  loopSlideshow: boolean;
  setLoopSlideshow: (loop: boolean) => void;
  focus: boolean;
  onToggleFocus: () => void;
  isPlaying: boolean;
  toggleSlideshow: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  study: Prompt | undefined;
  isSaved: (id: string) => boolean;
  toggleStudyBookmark: () => void;
  setShortcutsOpen: (open: boolean) => void;
}

export function ReaderToolbar({
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
  soundscapeEnabled,
  soundscapeVolume,
  onToggleSoundscape,
  onSoundscapeVolumeChange,
  onOpenTableOfContents,
  slideshowSpeed,
  setSlideshowSpeed,
  loopSlideshow,
  setLoopSlideshow,
  focus,
  onToggleFocus,
  isPlaying,
  toggleSlideshow,
  isFullscreen,
  toggleFullscreen,
  study,
  isSaved,
  toggleStudyBookmark,
  setShortcutsOpen,
}: ReaderToolbarProps) {
  const { t } = useLanguage();
  const compact = useMedia("(max-width: 1399px), (max-height: 600px)");
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const toolsPanel = useRef<HTMLDivElement>(null);
  // If rotation hides the expanded panel, keep focus on a visible control.
  useEffect(() => {
    if (
      compact &&
      !toolsOpen &&
      toolsPanel.current?.contains(document.activeElement)
    ) {
      toolsTrigger.current?.focus();
    }
  }, [compact, toolsOpen]);
  const [input, setInput] = useState(String(page));
  const [hint, setHint] = useState(false);
  const [soundscapeControlsOpen, setSoundscapeControlsOpen] = useState(false);
  useEffect(() => setInput(String(page)), [page]);
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
  return (
    <header
      id="reader-toolbar"
      className={`reader-top${compact ? " reader-toolbar-compact" : ""}${compact && toolsOpen ? " reader-tools-open" : ""}`}
    >
      <div className="reader-controls">
        <Link className="reader-issue" to={`/issues/${issue.slug}`}>
          Issue {issue.number}
        </Link>
        {!small && (
          <label className="chapter-control">
            <span className="sr-only">{t("Chapter")}</span>
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
        <Button
          variant="ghost"
          aria-label="Table of contents"
          aria-keyshortcuts="T"
          title={`${t("Table of contents")} (T)`}
          onClick={onOpenTableOfContents}
        >
          <span aria-hidden="true">☷</span>
          <span className="toc-button-label">{t("Index")}</span>
        </Button>
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
            <Button variant="ghost">{t("Display")}</Button>
          </DialogTrigger>
          <DialogContent>
            <div className="settings-grid">
              <label>
                {t("Theme")}
                <select
                  aria-label="Color theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                >
                  <option value="system">{t("Auto")}</option>
                  <option value="light">{t("Light")}</option>
                  <option value="dark">{t("Dark")}</option>
                  <option value="paper">{t("Paper")}</option>
                  <option value="sepia">{t("Sepia")}</option>
                  <option value="midnight">{t("Midnight Gallery")}</option>
                </select>
              </label>
              <label>
                {t("Jump to chapter")}
                <select
                  aria-label="Jump to chapter"
                  value={chapter.startPage}
                  onChange={(e) => go(Number(e.target.value))}
                >
                  <option value="1">{t("Front matter")}</option>
                  {issue.chapters.map((c) => (
                    <option key={c.startPage} value={c.startPage}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("View")}
                <select
                  aria-label="Reading mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "page" | "text")}
                >
                  <option value="page">{t("Original page")}</option>
                  <option value="text">{t("Reading view")}</option>
                </select>
              </label>
              {mode === "page" ? (
                <>
                  <label>
                    {t("Zoom")}
                    <select
                      aria-label="Zoom"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                    >
                      {[100, 125, 150, 200].map((n) => (
                        <option key={n} value={n}>
                          {n === 100 ? t("Fit") : `${n}%`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className={`spread-toggle-row ${!spreadCapable ? "is-disabled" : ""}`}
                  >
                    <span>{t("Two-page spread")}</span>
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
                  <legend>{t("Text size")}</legend>
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
                <span>{t("Paper turn sound")}</span>
                <input
                  type="checkbox"
                  aria-label="Paper turn sound (Web Audio)"
                  checked={soundEnabled}
                  onChange={toggleSound}
                />
              </label>
              <label>
                Slideshow speed
                <select
                  aria-label="Slideshow timing"
                  value={slideshowSpeed}
                  onChange={(e) => setSlideshowSpeed(Number(e.target.value))}
                >
                  <option value={4000}>4 seconds</option>
                  <option value={6000}>6 seconds (default)</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </label>
              <label className="loop-toggle-row">
                <span>{t("Loop presentation")}</span>
                <input
                  type="checkbox"
                  aria-label="Loop presentation slideshow"
                  checked={loopSlideshow}
                  onChange={(e) => setLoopSlideshow(e.target.checked)}
                />
              </label>
            </div>
            <div className="keyboard-guide">
              <h3>{t("Keyboard")}</h3>
              <p>
                ← / K previous · → / J next
                <br />
                Home / End first and last page
                <br />T Table of contents · R Reading view
                <br />P Play / Pause presentation slideshow
                <br />F Fullscreen reading / Focus
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
            <a href={issue.pdfUrl}>{t("Download original PDF ↗")}</a>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          className="focus-button"
          aria-pressed={focus}
          aria-keyshortcuts="F"
          onClick={onToggleFocus}
        >
          {compact && <span aria-hidden="true">◉</span>}
          <span className={compact ? "sr-only" : undefined}>
            {focus ? "Exit Focus" : "Focus"}
          </span>
        </Button>

        {compact && (
          <Button
            ref={toolsTrigger}
            variant="ghost"
            className="reader-tools-trigger"
            aria-expanded={toolsOpen}
            aria-controls="reader-tools"
            onClick={() => setToolsOpen((open) => !open)}
          >
            {t("Tools")}
          </Button>
        )}
        <div
          id="reader-tools"
          ref={toolsPanel}
          role="group"
          aria-label={t("Reader tools")}
          className="reader-tools"
          hidden={compact && !toolsOpen}
          onKeyDown={(event) => {
            if (compact && event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setToolsOpen(false);
              toolsTrigger.current?.focus();
            }
          }}
        >
          {compact && (
            <Button
              variant="ghost"
              onClick={() => {
                setToolsOpen(false);
                toolsTrigger.current?.focus();
              }}
            >
              {t("Close tools")}
            </Button>
          )}
          <CopyLinkButton path={readerPath(issue.slug, page)} label="Copy page link" />
          {/* Presentation Slideshow Play/Pause Button */}
          <Button
            variant="ghost"
            className={`reader-slideshow-btn ${isPlaying ? "is-playing" : ""}`}
            aria-label="Toggle presentation slideshow"
            aria-pressed={isPlaying}
            aria-keyshortcuts="P"
            title={
              isPlaying
                ? "Pause slideshow (P)"
                : "Play presentation slideshow (P)"
            }
            onClick={toggleSlideshow}
          >
            {isPlaying ? <Icon name="pause" /> : <Icon name="play" />}
            <span className="slideshow-label">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            className="reader-fullscreen-btn"
            aria-label="Toggle fullscreen"
            title="Toggle fullscreen (F)"
            aria-keyshortcuts="F"
            onClick={toggleFullscreen}
          >
            <Icon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} />
            <span className="sr-only">Fullscreen</span>
          </Button>
          <Button
            variant="ghost"
            className={`sound-fx-toggle-btn ${soundEnabled ? "is-active" : ""}`}
            aria-label={`Sound FX: ${soundEnabled ? "On" : "Off"}`}
            title={`Sound FX: ${soundEnabled ? "On" : "Off"}`}
            onClick={toggleSound}
          >
            {soundEnabled ? (
              <Icon name="speaker" />
            ) : (
              <Icon name="speaker-muted" />
            )}
            <span className="sound-fx-label">
              {soundEnabled ? "Sound: On" : "Sound: Off"}
            </span>
          </Button>
          <div className="soundscape-control">
            <Button
              variant="ghost"
              className={`soundscape-toggle-btn ${soundscapeEnabled ? "is-active" : ""}`}
              aria-label={
                soundscapeEnabled
                  ? "Mute Focus Soundscape"
                  : "Enable Focus Soundscape"
              }
              aria-pressed={soundscapeEnabled}
              onClick={onToggleSoundscape}
              title="Focus Soundscape"
            >
              {soundscapeEnabled ? "◖))" : "◖"}
              <span className="sound-fx-label">Ambience</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="Adjust soundscape volume"
              aria-expanded={soundscapeControlsOpen}
              onClick={() => setSoundscapeControlsOpen((open) => !open)}
            >
              ⌄
            </Button>
            {soundscapeControlsOpen && (
              <label className="soundscape-volume">
                <span>Soundscape volume</span>
                <input
                  aria-label="Soundscape volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundscapeVolume}
                  onChange={(event) =>
                    onSoundscapeVolumeChange(Number(event.target.value))
                  }
                />
              </label>
            )}
          </div>
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
              <Icon
                name={
                  isSaved(study.id)
                    ? "bookmark-straight-filled"
                    : "bookmark-straight"
                }
                size={18}
              />
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
      </div>
      <p className="chapter-progress">
        {chapter.title}{" "}
        <span>
          · {page - chapter.startPage + 1} of{" "}
          {chapter.endPage - chapter.startPage + 1}
        </span>
      </p>
    </header>
  );
}
