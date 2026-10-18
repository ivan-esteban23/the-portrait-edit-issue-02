import { useState, useRef, useEffect, type MouseEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";
import { formatPromptText, canShare, sharePrompt, type CopyFormat } from "@/lib/promptFormatter";

interface StudyCardProps {
  prompt: Prompt;
  to: string;
  headingLevel?: "h2" | "h3";
  isSaved?: boolean;
  onToggleSaved?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function StudyCard({
  prompt,
  to,
  headingLevel = "h2",
  isSaved = false,
  onToggleSaved,
  onTagClick,
  isComparing = false,
  onToggleCompare,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: StudyCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string>("Copied!");
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async (e: MouseEvent, format: CopyFormat = "raw") => {
    e.preventDefault();
    e.stopPropagation();
    if (timer.current) clearTimeout(timer.current);
    setMenuOpen(false);
    try {
      const text = formatPromptText(prompt, format);
      await copyText(text);
      setCopied(true);
      setCopiedFormat(format === "raw" ? "Copied!" : format === "params" ? "Copied +Params!" : "Copied MD!");
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard write failed */
    }
  };

  const handleToggleBookmark = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSaved?.(prompt.id);
  };

  const handleShare = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await sharePrompt(prompt, to);
  };

  const Heading = headingLevel;

  return (
    <article
      className={`study-card ${selectionMode ? "is-selection-mode" : ""} ${isSelected ? "is-selected" : ""}`}
    >
      <div className="study-card-media">
        {selectionMode && (
          <div
            className="card-selection-toggle"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.(prompt.id);
            }}
          >
            <input
              type="checkbox"
              className="card-selection-checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(prompt.id)}
              aria-label={`Select Study #${prompt.studyNumber}: ${prompt.title}`}
            />
          </div>
        )}
        <img
          src={assetUrl(prompt.referenceImage)}
          alt={prompt.title}
          loading="lazy"
        />
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          {/* Compare toggle button */}
          {onToggleCompare && (
            <button
              type="button"
              className={`card-action-btn compare-btn ${isComparing ? "is-comparing" : ""}`}
              title={isComparing ? "Remove from comparison" : "Add to compare"}
              aria-label={
                isComparing
                  ? `Remove Study ${prompt.studyNumber} from compare`
                  : `Add Study ${prompt.studyNumber} to compare`
              }
              aria-pressed={isComparing}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleCompare(prompt.id);
              }}
            >
              <span className="btn-icon">⇄</span>
              <span className="action-tooltip">
                {isComparing ? "Comparing" : "Compare"}
              </span>
            </button>
          )}

          {/* Quick copy with format options */}
          <div className="copy-action-wrapper">
            <button
              type="button"
              className={`card-action-btn copy-btn ${copied ? "is-copied" : ""}`}
              title={copied ? copiedFormat : "Copy prompt"}
              aria-label={
                copied
                  ? `Copied prompt for Study ${prompt.studyNumber}`
                  : `Copy prompt for Study ${prompt.studyNumber}`
              }
              onClick={(e) => handleCopy(e, "raw")}
            >
              {copied ? (
                <span className="btn-icon">✓</span>
              ) : (
                <svg
                  className="btn-icon-svg"
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              <span className="action-tooltip">
                {copied ? copiedFormat : "Copy prompt"}
              </span>
            </button>

            <button
              type="button"
              className="copy-format-trigger"
              title="Copy formats (Raw, Params, Markdown)"
              aria-label={`Copy format options for Study ${prompt.studyNumber}`}
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              ▾
            </button>

            {menuOpen && (
              <div
                className="format-dropdown-menu"
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="format-menu-item"
                  onClick={(e) => handleCopy(e, "raw")}
                >
                  Raw Prompt
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="format-menu-item"
                  onClick={(e) => handleCopy(e, "params")}
                >
                  With Parameters
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="format-menu-item"
                  onClick={(e) => handleCopy(e, "markdown")}
                >
                  Markdown Card
                </button>
              </div>
            )}
          </div>

          {/* Web Share API button if supported */}
          {canShare() && (
            <button
              type="button"
              className="card-action-btn share-btn"
              title="Share study"
              aria-label={`Share Study ${prompt.studyNumber}`}
              onClick={handleShare}
            >
              <svg
                className="btn-icon-svg"
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
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span className="action-tooltip">Share</span>
            </button>
          )}

          {/* Bookmark button */}
          <button
            type="button"
            className={`card-action-btn bookmark-btn ${isSaved ? "is-saved" : ""}`}
            title={isSaved ? "Remove from saved" : "Save study"}
            aria-label={
              isSaved
                ? `Remove Study ${prompt.studyNumber} from saved`
                : `Save Study ${prompt.studyNumber}`
            }
            aria-pressed={isSaved}
            onClick={handleToggleBookmark}
          >
            <svg
              className="btn-icon-svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isSaved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className="action-tooltip">
              {isSaved ? "Saved" : "Save study"}
            </span>
          </button>
        </div>
      </div>
      <p className="eyebrow">Study {String(prompt.studyNumber).padStart(3, "0")}</p>
      <Heading>{prompt.title}</Heading>
      <p className="study-card-style">{prompt.style}</p>
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="card-tags-list" aria-label="Style tags">
          {prompt.tags.map((t) => (
            <span
              key={t}
              role="button"
              tabIndex={0}
              className="tag-badge"
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onTagClick?.(t);
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick?.(t);
                }
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <Link
        className="study-card-overlay"
        to={to}
        aria-label={`View study ${prompt.title || prompt.id}`}
        onClick={(e) => {
          if (selectionMode) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect?.(prompt.id);
          }
        }}
      />
    </article>
  );
}
