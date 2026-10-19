import { useState, useRef, useCallback, type MouseEvent } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { Button } from "./ui/button";
import { ModalContent, ModalTitle } from "./ui/dialog";
import { copyText } from "@/lib/utils";
import { formatPromptText, type CopyFormat } from "@/lib/promptFormatter";
import { getCommandParameters } from "@/lib/promptFormatter";
import { parsePromptTokens } from "@/lib/promptParser";

interface CompareLabProps {
  studyA: Prompt;
  studyB: Prompt;
  isOpen: boolean;
  onClose: () => void;
  onSwap: () => void;
  onInspectImage?: (src: string, alt: string, title: string) => void;
}

export function CompareLab({
  studyA,
  studyB,
  isOpen,
  onClose,
  onSwap,
  onInspectImage,
}: CompareLabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"side-by-side" | "split">("side-by-side");
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [combinedCopied, setCombinedCopied] = useState(false);
  const sliderFrameRef = useRef<HTMLDivElement>(null);

  const closeButton = useRef<HTMLButtonElement>(null);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    if (!sliderFrameRef.current) return;
    const rect = sliderFrameRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSplitPos(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSplitFromClientX(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateSplitFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  const handleCopy = async (
    prompt: Prompt,
    format: CopyFormat,
    e: MouseEvent,
  ) => {
    e.preventDefault();
    try {
      const text = formatPromptText(prompt, format);
      await copyText(text);
      setCopiedId(`${prompt.id}-${format}`);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const descriptorsA = parsePromptTokens(studyA.prompt).categories.flatMap(
    (category) => category.tokens,
  );
  const descriptorsB = parsePromptTokens(studyB.prompt).categories.flatMap(
    (category) => category.tokens,
  );
  const normalizedA = new Set(
    descriptorsA.map((phrase) => phrase.toLocaleLowerCase().trim()),
  );
  const normalizedB = new Set(
    descriptorsB.map((phrase) => phrase.toLocaleLowerCase().trim()),
  );
  const sharedDescriptors = descriptorsA.filter((phrase) =>
    normalizedB.has(phrase.toLocaleLowerCase().trim()),
  );
  const uniqueA = descriptorsA.filter(
    (phrase) => !normalizedB.has(phrase.toLocaleLowerCase().trim()),
  );
  const uniqueB = descriptorsB.filter(
    (phrase) => !normalizedA.has(phrase.toLocaleLowerCase().trim()),
  );
  const parameterValues = (prompt: Prompt) => {
    const values: Record<string, string> = {
      Model: prompt.model || "Midjourney",
    };
    getCommandParameters(prompt).forEach(({ key, value }) => {
      const label =
        key === "ar"
          ? "Aspect Ratio"
          : key === "s"
            ? "Stylize"
            : key === "v"
              ? "Version"
              : key === "c"
                ? "Chaos"
                : key.toUpperCase();
      values[label] = value || "On";
    });
    return values;
  };
  const parameterA = parameterValues(studyA);
  const parameterB = parameterValues(studyB);
  const parameterKeys = [
    ...new Set([...Object.keys(parameterA), ...Object.keys(parameterB)]),
  ];
  const copyCombined = async () => {
    const combined = [
      ...descriptorsA,
      ...descriptorsB.filter(
        (phrase) => !normalizedA.has(phrase.toLocaleLowerCase().trim()),
      ),
    ];
    try {
      await copyText(combined.join(", "));
      setCombinedCopied(true);
      window.setTimeout(() => setCombinedCopied(false), 1600);
    } catch {
      /* Keep the comparison usable when clipboard access is blocked. */
    }
  };

  const renderPromptDetails = (prompt: Prompt, label: string) => {
    const paramsList = Object.entries(prompt.parameters || {});
    return (
      <div className="compare-details-pane">
        <div className="compare-col-header">
          <span className="compare-badge">{label}</span>
          <h3>
            Study {String(prompt.studyNumber).padStart(3, "0")}: {prompt.title}
          </h3>
          <p className="compare-meta">
            Issue 02 · Page {prompt.page} · {prompt.model || "Midjourney"}
          </p>
        </div>

        <div className="compare-section">
          <div className="compare-section-header">
            <h4>Prompt</h4>
            <div className="compare-copy-group">
              <button
                type="button"
                className="format-copy-btn"
                onClick={(e) => handleCopy(prompt, "raw", e)}
                title="Copy raw prompt text"
              >
                {copiedId === `${prompt.id}-raw` ? "✓ Copied" : "Copy Raw"}
              </button>
              <button
                type="button"
                className="format-copy-btn"
                onClick={(e) => handleCopy(prompt, "params", e)}
                title="Copy prompt with parameter flags"
              >
                {copiedId === `${prompt.id}-params` ? "✓ Copied" : "+ Params"}
              </button>
              <button
                type="button"
                className="format-copy-btn"
                onClick={(e) => handleCopy(prompt, "markdown", e)}
                title="Copy formatted Markdown card"
              >
                {copiedId === `${prompt.id}-markdown` ? "✓ Copied" : "Markdown"}
              </button>
            </div>
          </div>
          <p className="compare-prompt-text">{prompt.prompt}</p>
        </div>

        <div className="compare-section">
          <h4>Parameters</h4>
          {paramsList.length > 0 ? (
            <div className="compare-params-grid">
              {paramsList.map(([k, v]) => (
                <div key={k} className="compare-param-item">
                  <span className="param-key">{k}</span>
                  <span className="param-val">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="compare-empty-note">Standard editorial parameters</p>
          )}
        </div>

        <div className="compare-section">
          <h4>Tags & Style</h4>
          <p className="compare-style-lead">{prompt.style}</p>
          <div className="compare-tags">
            {prompt.tags.map((t) => (
              <span key={t} className="tag-badge">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {prompt.workingNotes && (
          <div className="compare-section">
            <h4>Working Notes</h4>
            <p className="compare-note-text">{prompt.workingNotes}</p>
          </div>
        )}

        {prompt.tryThis && (
          <div className="compare-section">
            <h4>Variations to Try</h4>
            <p className="compare-note-text">{prompt.tryThis}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSideBySideColumn = (prompt: Prompt, label: string) => {
    return (
      <div className="compare-column">
        <div className="compare-image-wrap">
          <button
            type="button"
            className="compare-inspect-btn"
            onClick={(event) => {
              event.currentTarget.focus();
              onInspectImage?.(
                assetUrl(prompt.referenceImage),
                prompt.title,
                `Study #${prompt.studyNumber}: ${prompt.title}`,
              );
            }}
            title="Click to inspect image fullscreen"
          >
            <img
              src={assetUrl(prompt.referenceImage)}
              alt={prompt.title}
              className="compare-image"
            />
            <span className="compare-inspect-hint">🔍 Inspect</span>
          </button>
        </div>
        {renderPromptDetails(prompt, label)}
      </div>
    );
  };

  return (
    <ModalContent
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="compare-lab-overlay"
      className="compare-lab-container"
      initialFocus={closeButton}
    >
      <header className="compare-lab-toolbar">
        <div className="compare-lab-title">
          <ModalTitle asChild>
            <h2>Compare Lab</h2>
          </ModalTitle>
          <p>Evaluating prompt variations, camera notes, and visual outputs</p>
        </div>

        <div className="compare-toolbar-controls">
          {/* Segmented Control: Side by Side | Split Curtain */}
          <div
            className="compare-mode-segmented"
            role="radiogroup"
            aria-label="Comparison layout"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "side-by-side"}
              className={`segmented-mode-btn ${mode === "side-by-side" ? "is-active" : ""}`}
              onClick={() => setMode("side-by-side")}
            >
              Side by Side
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "split"}
              className={`segmented-mode-btn ${mode === "split" ? "is-active" : ""}`}
              onClick={() => setMode("split")}
            >
              Split Curtain
            </button>
          </div>

          <Button
            variant="outline"
            onClick={onSwap}
            title="Swap left and right studies"
          >
            ⇄ Swap Studies
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            ref={closeButton}
            aria-label="Close compare lab"
            className="compare-close-btn"
          >
            Close ✕
          </Button>
        </div>
      </header>

      {mode === "side-by-side" ? (
        <div className="compare-stage">
          {renderSideBySideColumn(studyA, "Study A")}
          <div className="compare-divider" aria-hidden="true" />
          {renderSideBySideColumn(studyB, "Study B")}
        </div>
      ) : (
        <div className="split-curtain-container">
          {/* Split Curtain Frame */}
          <div
            ref={sliderFrameRef}
            className={`split-curtain-frame ${isDragging ? "is-dragging" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Study B (Background / Right) */}
            <div className="split-layer split-layer-b">
              <img
                src={assetUrl(studyB.referenceImage)}
                alt={`Study B: ${studyB.title}`}
                className="split-layer-img"
                draggable={false}
              />
              <span className="split-side-badge badge-right">
                Study B: #{studyB.studyNumber}
              </span>
            </div>

            {/* Study A (Foreground / Left, clipped by percentage) */}
            <div
              className="split-layer split-layer-a"
              style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
            >
              <img
                src={assetUrl(studyA.referenceImage)}
                alt={`Study A: ${studyA.title}`}
                className="split-layer-img"
                draggable={false}
              />
              <span className="split-side-badge badge-left">
                Study A: #{studyA.studyNumber}
              </span>
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="split-curtain-handle"
              style={{ left: `${splitPos}%` }}
              role="slider"
              aria-label="Curtain comparison slider"
              aria-valuenow={Math.round(splitPos)}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setSplitPos((p) => Math.max(0, p - 4));
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setSplitPos((p) => Math.min(100, p + 4));
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setSplitPos(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setSplitPos(100);
                }
              }}
            >
              <div className="split-handle-line" />
              <div className="split-handle-thumb">
                <span className="thumb-arrow">‹</span>
                <span className="thumb-arrow">›</span>
              </div>
            </div>
          </div>

          <div className="split-slider-instructions">
            <span>Drag handle or swipe to compare details</span>
            <span>
              Study A ({Math.round(splitPos)}%) ⇄ Study B (
              {Math.round(100 - splitPos)}%)
            </span>
          </div>

          {/* Split Details Below Slider */}
          <div className="split-meta-stage">
            <div className="split-meta-col">
              {renderPromptDetails(studyA, "Study A (Left)")}
            </div>
            <div className="compare-divider" aria-hidden="true" />
            <div className="split-meta-col">
              {renderPromptDetails(studyB, "Study B (Right)")}
            </div>
          </div>
        </div>
      )}
      <section
        className="prompt-comparison-panel"
        aria-label="Prompt comparison"
      >
        <header className="prompt-comparison-heading">
          <div>
            <span className="eyebrow">Editorial analysis</span>
            <h3>Prompt Comparison</h3>
          </div>
          <Button variant="outline" onClick={() => void copyCombined()}>
            {combinedCopied
              ? "✓ Combined Prompt Copied"
              : "Copy Combined Prompt"}
          </Button>
        </header>
        <div className="prompt-diff-grid">
          {[
            { label: "Study A", unique: uniqueA },
            { label: "Study B", unique: uniqueB },
          ].map((column) => (
            <div className="prompt-diff-column" key={column.label}>
              <h4>{column.label} descriptors</h4>
              <div className="prompt-diff-tokens">
                {sharedDescriptors.map((phrase, index) => (
                  <span
                    className="prompt-diff-token is-shared"
                    key={`shared-${index}-${phrase}`}
                  >
                    {phrase}
                  </span>
                ))}
                {column.unique.map((phrase, index) => (
                  <span
                    className={`prompt-diff-token ${column.label === "Study A" ? "is-unique-a" : "is-unique-b"}`}
                    key={`${column.label}-${index}-${phrase}`}
                  >
                    {phrase}
                  </span>
                ))}
                {!sharedDescriptors.length && !column.unique.length && (
                  <p className="compare-empty-note">
                    No descriptive phrases found.
                  </p>
                )}
              </div>
              <p className="prompt-diff-legend">
                Neutral = shared · Accent = unique to this study
              </p>
            </div>
          ))}
        </div>
        <div className="prompt-parameter-diff">
          <h4>Parameter differences</h4>
          <table>
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">Study A</th>
                <th scope="col">Study B</th>
              </tr>
            </thead>
            <tbody>
              {parameterKeys.map((key) => {
                const valueA = parameterA[key] ?? "—";
                const valueB = parameterB[key] ?? "—";
                return (
                  <tr
                    key={key}
                    className={valueA !== valueB ? "is-different" : ""}
                  >
                    <th scope="row">{key}</th>
                    <td>{valueA}</td>
                    <td>{valueB}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </ModalContent>
  );
}
