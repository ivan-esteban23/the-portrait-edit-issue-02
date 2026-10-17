import { useEffect, useState, type MouseEvent } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { Button } from "./ui/button";
import { copyText } from "@/lib/utils";
import { formatPromptText, type CopyFormat } from "@/lib/promptFormatter";

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async (prompt: Prompt, format: CopyFormat, e: MouseEvent) => {
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

  const renderColumn = (prompt: Prompt, label: string) => {
    const paramsList = Object.entries(prompt.parameters || {});
    return (
      <div className="compare-column">
        <div className="compare-col-header">
          <span className="compare-badge">{label}</span>
          <h3>
            Study {String(prompt.studyNumber).padStart(3, "0")}: {prompt.title}
          </h3>
          <p className="compare-meta">
            Issue 02 · Page {prompt.page} · {prompt.model || "Midjourney"}
          </p>
        </div>

        <div className="compare-image-wrap">
          <button
            type="button"
            className="compare-inspect-btn"
            onClick={() =>
              onInspectImage?.(
                assetUrl(prompt.referenceImage),
                prompt.title,
                `Study #${prompt.studyNumber}: ${prompt.title}`,
              )
            }
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

  return (
    <div className="compare-lab-overlay" role="dialog" aria-modal="true" aria-label="Prompt comparison lab">
      <div className="compare-lab-container">
        <header className="compare-lab-toolbar">
          <div className="compare-lab-title">
            <h2>Side-by-Side Compare Lab</h2>
            <p>Evaluating prompt variations, camera notes, and visual outputs</p>
          </div>
          <div className="compare-lab-actions">
            <Button variant="outline" onClick={onSwap} title="Swap left and right studies">
              ⇄ Swap Columns
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              aria-label="Close compare lab"
              className="compare-close-btn"
            >
              Close ✕
            </Button>
          </div>
        </header>

        <div className="compare-stage">
          {renderColumn(studyA, "Study A")}
          <div className="compare-divider" aria-hidden="true" />
          {renderColumn(studyB, "Study B")}
        </div>
      </div>
    </div>
  );
}
