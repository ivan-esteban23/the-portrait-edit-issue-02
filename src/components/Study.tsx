import { IconText } from "@/components/ui/IconText";
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
  const moreActions = useRef<HTMLDetailsElement>(null);
  function closeActions() {
    if (moreActions.current) {
      moreActions.current.open = false;
      moreActions.current.querySelector("summary")?.focus();
    }
  }
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [exportingCard, setExportingCard] = useState(false);
  const feedbackRequest = useRef(0);
  useEffect(() => {
    feedbackRequest.current += 1;
    setFeedback("");
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
      feedbackRequest.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copyFormat(format: CopyFormat = "raw") {
    if (busyRef.current) return;
    busyRef.current = true;
    const current = ++feedbackRequest.current;
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
      if (!alive.current || current !== feedbackRequest.current) return;
      let msg = "Prompt copied.";
      if (format === "discord") msg = "Discord /imagine command copied.";
      else if (format === "params") msg = "Midjourney prompt copied.";
      else if (format === "markdown") msg = "Markdown card copied.";
      setFeedback(msg);
      timer.current = setTimeout(() => setFeedback(""), 1600);
    } catch {
      if (alive.current && current === feedbackRequest.current)
        setFeedback("Copy unavailable. Select the prompt text to copy it.");
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function handleExportCard() {
    const current = ++feedbackRequest.current;
    if (timer.current) clearTimeout(timer.current);
    setFeedback("");
    setExportingCard(true);
    try {
      await exportStudyRecipeCard(prompt);
      if (alive.current && current === feedbackRequest.current) {
        setFeedback("Recipe card PNG exported.");
        timer.current = setTimeout(() => setFeedback(""), 2000);
      }
    } catch {
      if (alive.current && current === feedbackRequest.current) {
        setFeedback("Unable to export recipe card.");
      }
    } finally {
      if (alive.current) setExportingCard(false);
    }
  }

  return (
    <section className="prompt-card" aria-label="Image prompt">
      <div className="prompt-card-heading">
        <h2>Image Prompt</h2>
        <div className="prompt-copy-actions">
          <Button
            variant="default"
            onClick={() => copyFormat("raw")}
            aria-disabled={busy}
          >
            {feedback === "Prompt copied."
              ? "Copied"
              : busy
                ? "Copying…"
                : "Copy prompt"}
          </Button>
          {onOpenStudio && (
            <Button variant="outline" onClick={onOpenStudio}>
              Customize prompt
            </Button>
          )}
          <details
            className="prompt-more-actions"
            ref={moreActions}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeActions();
              }
            }}
          >
            <summary>More actions</summary>
            <div className="prompt-action-list">
              <Button
                variant="ghost"
                onClick={() => {
                  if (busyRef.current) return;
                  closeActions();
                  void copyFormat("discord");
                }}
                aria-disabled={busy}
              >
                Copy Discord /imagine
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (busyRef.current) return;
                  closeActions();
                  void copyFormat("params");
                }}
                aria-disabled={busy}
              >
                Copy with parameters
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (busyRef.current) return;
                  closeActions();
                  void copyFormat("markdown");
                }}
                aria-disabled={busy}
              >
                Copy as Markdown
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  closeActions();
                  void handleExportCard();
                }}
                disabled={exportingCard}
              >
                {exportingCard
                  ? "Generating recipe card…"
                  : "Download recipe card"}
              </Button>
              <Button
                variant="ghost"
                aria-pressed={anatomyOpen}
                onClick={() => {
                  closeActions();
                  setAnatomyOpen((open) => !open);
                }}
              >
                Analyze prompt
              </Button>
            </div>
          </details>
        </div>
      </div>
      <p role="status" className="copy-feedback">
        {feedback}
      </p>
      <CommandParameters
        parameters={parameters}
        enabled={enabledParameters}
        onChange={setEnabledParameters}
        isOptionalPreset={!recordedParameters.length}
        hint={
          recordedParameters.length
            ? undefined
            : "Optional starting points (not recorded in the study). Select flags for your command."
        }
      />
      {anatomyOpen ? (
        <PromptAnatomy prompt={prompt.prompt} />
      ) : (
        <p className="prompt-body">{prompt.prompt}</p>
      )}
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

  return (
    <article className="study-article">
      <header>
        <div className="study-header-row">
          <p className="eyebrow">
            Study {String(prompt.studyNumber).padStart(3, "0")}{" "}
            <span> / Page {prompt.page}</span>
          </p>
          <div className="study-header-actions">
            <CopyLinkButton path={`/prompts/${prompt.id}`} />
            {canShare() && (
              <Button
                variant="ghost"
                className="study-share-btn"
                onClick={() => sharePrompt(prompt)}
                aria-label="Share study"
                title="Share study"
              >
                <IconText>Share ↗</IconText>
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
        <h2>Working notes</h2>
        <p className="preserve-text">{prompt.workingNotes}</p>
      </section>
      <section className="article-section">
        <h2>Try this</h2>
        <p className="preserve-text">{prompt.tryThis}</p>
      </section>
      <RelatedStudies prompt={prompt} context={context} />
    </article>
  );
}
