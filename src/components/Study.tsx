import { Icon } from "@/components/ui/Icon";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";
import { Button } from "./ui/button";
import { useBookmarks } from "@/hooks/useBookmarks";
import { exportStudyRecipeCard } from "@/lib/cardExport";
import {
  formatPromptText,
  getCommandParameters,
  formatCommand,
  canShare,
  sharePrompt,
  type CopyFormat,
} from "@/lib/promptFormatter";

import { CommandParameters } from "./CommandParameters";
import { RelatedStudies } from "./RelatedStudies";
import { PromptAnatomy } from "./PromptAnatomy";
import { CopyLinkButton } from "./CopyLinkButton";

const ImageLightbox = lazy(() =>
  import("./ImageLightbox").then((m) => ({ default: m.ImageLightbox })),
);
const PromptStudioDrawer = lazy(() =>
  import("./PromptStudioDrawer").then((m) => ({
    default: m.PromptStudioDrawer,
  })),
);

export function PromptCard({
  prompt,
  onOpenStudio,
}: {
  prompt: Prompt;
  onOpenStudio?: () => void;
}) {
  const recordedParameters = getCommandParameters(prompt);
  const parameters = recordedParameters.length
    ? recordedParameters
    : [
        { key: "ar", value: "4:5" },
        { key: "v", value: "6.1" },
        { key: "s", value: "250" },
      ];
  const [enabledParameters, setEnabledParameters] = useState(() =>
    recordedParameters.map((parameter) => parameter.key),
  );
  const [feedback, setFeedback] = useState("");
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportingCard, setExportingCard] = useState(false);
  useEffect(() => {
    setEnabledParameters(
      getCommandParameters(prompt).map((parameter) => parameter.key),
    );
  }, [prompt.id]);
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
      const command = formatCommand(
        prompt.prompt,
        parameters,
        enabledParameters,
      );
      const text =
        format === "discord"
          ? `/imagine prompt: ${command}`
          : format === "params"
            ? command
            : formatPromptText(prompt, format);
      await copyText(text);
      if (!alive.current) return;
      let msg = "Prompt copied.";
      if (format === "discord") msg = "Discord /imagine command copied.";
      else if (format === "params") msg = "Midjourney prompt copied.";
      else if (format === "markdown") msg = "Markdown card copied.";
      setFeedback(msg);
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
          <Button
            variant="ghost"
            onClick={() => copyFormat("raw")}
            disabled={busy}
          >
            {feedback === "Prompt copied."
              ? "Copied"
              : busy
                ? "Copying…"
                : "Copy prompt"}
          </Button>
          <Button
            variant={anatomyOpen ? "outline" : "ghost"}
            aria-pressed={anatomyOpen}
            onClick={() => setAnatomyOpen((open) => !open)}
          >
            Anatomy / X-Ray
          </Button>
          <div className="prompt-secondary-actions">
            <Button
              variant="outline"
              className="format-sub-btn discord-copy-btn"
              onClick={() => copyFormat("discord")}
              disabled={busy}
              title="Copy Discord /imagine command"
              aria-label="Discord /imagine"
            >
              <span className="btn-label-long">Discord /imagine</span>
              <span className="btn-label-short">/imagine</span>
            </Button>
            <Button
              variant="outline"
              className="format-sub-btn mj-copy-btn"
              onClick={() => copyFormat("params")}
              disabled={busy}
              title="Copy Midjourney prompt with parameters"
              aria-label="Midjourney (+ Params)"
            >
              <span className="btn-label-long">+ Params</span>
              <span className="btn-label-short">+ Params</span>
            </Button>
            <Button
              variant="outline"
              className="format-sub-btn"
              onClick={() => copyFormat("markdown")}
              disabled={busy}
              title="Copy formatted Markdown card"
              aria-label="Markdown"
            >
              <span className="btn-label-long">Markdown</span>
              <span className="btn-label-short">MD</span>
            </Button>
            <Button
              variant="outline"
              className="card-tool-btn adjust-params-btn"
              onClick={() => onOpenStudio?.()}
              title="Open Prompt Studio parameter tweaker"
              aria-label="Adjust Parameters"
            >
              <span className="btn-label-long">Adjust Parameters</span>
              <span className="btn-label-short">Adjust</span>
            </Button>
            <Button
              variant="outline"
              className="card-tool-btn recipe-card-export-btn"
              onClick={handleExportCard}
              disabled={exportingCard}
              title="Save as 1080x1350 editorial PNG recipe card"
              aria-label="Save Recipe Card"
            >
              <Icon name="download" size={14} className="download-icon-svg" />
              <span className="btn-label-long">
                {exportingCard ? "Generating…" : "Save Recipe Card"}
              </span>
              <span className="btn-label-short">
                {exportingCard ? "…" : "Card"}
              </span>
            </Button>
          </div>
        </div>
      </div>
      <CommandParameters
        parameters={parameters}
        enabled={enabledParameters}
        onChange={setEnabledParameters}
        hint={
          recordedParameters.length
            ? undefined
            : "Optional starting points. Select flags for your command."
        }
      />
      {anatomyOpen ? (
        <PromptAnatomy prompt={prompt.prompt} />
      ) : (
        <p className="prompt-body">{prompt.prompt}</p>
      )}
      <p role="status" className="copy-feedback">
        {feedback}
      </p>
      <p className="source-note">Text checked against the published study.</p>
    </section>
  );
}

export function Study({
  prompt,
  context = "detail",
}: {
  prompt: Prompt;
  context?: "detail" | "reader";
}) {
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
              <span className="btn-label-long">Adjust Parameters</span>
              <span className="btn-label-short">Adjust</span>
            </Button>
            <Button
              variant="ghost"
              className="study-header-tool-btn recipe-card-header-btn"
              onClick={handleExportCard}
              disabled={exportingCard}
              aria-label="Save Recipe Card as PNG"
              title="Export 1080x1350 editorial recipe card PNG"
            >
              <Icon name="download" size={14} className="download-icon-svg" />
              <span className="btn-label-long">
                {exportingCard ? "Generating…" : "Save Recipe Card"}
              </span>
              <span className="btn-label-short">
                {exportingCard ? "…" : "Card"}
              </span>
            </Button>
            <CopyLinkButton path={`/prompts/${prompt.id}`} />
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
          onClick={(event) => {
            event.currentTarget.focus();
            setLightboxOpen(true);
          }}
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

      {lightboxOpen && (
        <Suspense fallback={null}>
          <ImageLightbox
            src={assetUrl(prompt.referenceImage)}
            alt={`Reference for ${prompt.title}`}
            title={`Study ${String(prompt.studyNumber).padStart(3, "0")} · ${prompt.title}`}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </Suspense>
      )}

      {studioOpen && (
        <Suspense fallback={null}>
          <PromptStudioDrawer
            prompt={prompt}
            isOpen={studioOpen}
            onClose={() => setStudioOpen(false)}
          />
        </Suspense>
      )}

      <PromptCard
        key={prompt.id}
        prompt={prompt}
        onOpenStudio={() => setStudioOpen(true)}
      />
      <section className="article-section">
        <h3>Working notes</h3>
        <p className="preserve-text">{prompt.workingNotes}</p>
      </section>
      <section className="article-section">
        <h3>Try this</h3>
        <p className="preserve-text">{prompt.tryThis}</p>
      </section>
      <RelatedStudies prompt={prompt} context={context} />
    </article>
  );
}
