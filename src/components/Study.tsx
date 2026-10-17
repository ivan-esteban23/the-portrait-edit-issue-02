import { useEffect, useRef, useState } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";
import { Button } from "./ui/button";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ImageLightbox } from "./ImageLightbox";
import { PromptStudioDrawer } from "./PromptStudioDrawer";
import { exportStudyRecipeCard } from "@/lib/cardExport";
import { formatPromptText, canShare, sharePrompt, type CopyFormat } from "@/lib/promptFormatter";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copyFormat(format: CopyFormat = "raw") {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setFeedback("");
    try {
      const text = formatPromptText(prompt, format);
      await copyText(text);
      if (!alive.current) return;
      setFeedback(
        format === "raw"
          ? "Prompt copied."
          : format === "params"
            ? "Prompt with parameters copied."
            : "Markdown card copied.",
      );
      timer.current = setTimeout(() => setFeedback(""), 1600);
    } catch {
      if (alive.current)
        setFeedback("Copy unavailable. Select the prompt text to copy it.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function handleExportCard() {
    setExportingCard(true);
    try {
      await exportStudyRecipeCard(prompt);
      if (alive.current) {
        setFeedback("Recipe card PNG exported.");
        timer.current = setTimeout(() => setFeedback(""), 2000);
      }
    } catch {
      if (alive.current) {
        setFeedback("Unable to export recipe card.");
      }
    } finally {
      if (alive.current) setExportingCard(false);
    }
  }

  return (
    <section className="prompt-card" aria-label="Image prompt">
      <div className="prompt-card-heading">
        <h3>Image Prompt</h3>
        <div className="prompt-copy-actions">
          <Button variant="ghost" onClick={() => copyFormat("raw")} disabled={busy}>
            {feedback === "Prompt copied."
              ? "Copied"
              : busy
                ? "Copying…"
                : "Copy prompt"}
          </Button>
          <Button
            variant="outline"
            className="format-sub-btn"
            onClick={() => copyFormat("params")}
            disabled={busy}
            title="Copy prompt with parameter flags"
          >
            + Params
          </Button>
          <Button
            variant="outline"
            className="format-sub-btn"
            onClick={() => copyFormat("markdown")}
            disabled={busy}
            title="Copy formatted Markdown card"
          >
            Markdown
          </Button>
          <Button
            variant="outline"
            className="card-tool-btn adjust-params-btn"
            onClick={() => setStudioOpen(true)}
            title="Open Prompt Studio parameter tweaker"
          >
            Adjust Parameters
          </Button>
          <Button
            variant="outline"
            className="card-tool-btn recipe-card-export-btn"
            onClick={handleExportCard}
            disabled={exportingCard}
            title="Save as 1080x1350 editorial PNG recipe card"
          >
            <svg
              className="download-icon-svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{exportingCard ? "Generating…" : "Save Recipe Card"}</span>
          </Button>
        </div>
      </div>
      <p className="prompt-body">{prompt.prompt}</p>
      <p role="status" className="copy-feedback">
        {feedback}
      </p>
      <p className="source-note">Text checked against the published study.</p>

      {/* Interactive Prompt Studio / Parameter Tweaker Drawer */}
      <PromptStudioDrawer
        prompt={prompt}
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
      />
    </section>
  );
}

export function Study({ prompt }: { prompt: Prompt }) {
  const { isSaved, toggleSaved } = useBookmarks();
  const saved = isSaved(prompt.id);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);

  const handleExportCard = async () => {
    setExportingCard(true);
    try {
      await exportStudyRecipeCard(prompt);
    } catch {
      /* ignore */
    } finally {
      setExportingCard(false);
    }
  };

  return (
    <article className="study-article">
      <header>
        <div className="study-header-row">
          <p className="eyebrow">
            Study {String(prompt.studyNumber).padStart(3, "0")}{" "}
            <span> / Page {prompt.page}</span>
          </p>
          <div className="study-header-actions">
            <Button
              variant="ghost"
              className="study-header-tool-btn"
              onClick={() => setStudioOpen(true)}
              aria-label="Adjust Parameters in Prompt Studio"
              title="Open Prompt Studio drawer"
            >
              Adjust Parameters
            </Button>
            <Button
              variant="ghost"
              className="study-header-tool-btn recipe-card-header-btn"
              onClick={handleExportCard}
              disabled={exportingCard}
              aria-label="Save Recipe Card as PNG"
              title="Export 1080x1350 editorial recipe card PNG"
            >
              <svg
                className="download-icon-svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{exportingCard ? "Generating…" : "Save Recipe Card"}</span>
            </Button>
            {canShare() && (
              <Button
                variant="ghost"
                className="study-share-btn"
                onClick={() => sharePrompt(prompt)}
                aria-label="Share study"
                title="Share study"
              >
                Share ↗
              </Button>
            )}
            <Button
              variant="ghost"
              className={`study-bookmark-toggle ${saved ? "is-saved" : ""}`}
              aria-pressed={saved}
              onClick={() => toggleSaved(prompt.id)}
              aria-label={saved ? "Remove from saved" : "Save study"}
            >
              <span className="bookmark-icon" aria-hidden="true">
                {saved ? "★" : "☆"}
              </span>
              <span>{saved ? "Saved" : "Save study"}</span>
            </Button>
          </div>
        </div>
        <h1>{prompt.title}</h1>
        <p className="study-style">{prompt.style}</p>
      </header>
      <figure className="study-figure">
        <button
          type="button"
          className="image-inspect-trigger"
          onClick={() => setLightboxOpen(true)}
          title="Click to inspect image in detail"
          aria-label={`Inspect high-resolution reference for ${prompt.title}`}
        >
          <img
            src={assetUrl(prompt.referenceImage)}
            alt={`Reference for ${prompt.title}`}
            decoding="async"
          />
          <span className="inspect-badge" aria-hidden="true">
            🔍 Inspect
          </span>
        </button>
        <figcaption>
          Source: {prompt.source}
          <span>{prompt.flags}</span>
        </figcaption>
      </figure>

      <ImageLightbox
        src={assetUrl(prompt.referenceImage)}
        alt={`Reference for ${prompt.title}`}
        title={`Study ${String(prompt.studyNumber).padStart(3, "0")} · ${prompt.title}`}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <PromptStudioDrawer
        prompt={prompt}
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
      />

      <PromptCard key={prompt.id} prompt={prompt} />
      <section className="article-section">
        <h3>Working notes</h3>
        <p className="preserve-text">{prompt.workingNotes}</p>
      </section>
      <section className="article-section">
        <h3>Try this</h3>
        <p className="preserve-text">{prompt.tryThis}</p>
      </section>
    </article>
  );
}
