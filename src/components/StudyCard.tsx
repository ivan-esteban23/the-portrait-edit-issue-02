import { useState, useRef, useEffect, type MouseEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";

interface StudyCardProps {
  prompt: Prompt;
  to: string;
  headingLevel?: "h2" | "h3";
  isSaved: boolean;
  onToggleSaved: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export function StudyCard({
  prompt,
  to,
  headingLevel = "h2",
  isSaved,
  onToggleSaved,
  onTagClick,
}: StudyCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (timer.current) clearTimeout(timer.current);
    try {
      await copyText(prompt.prompt);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard write failed */
    }
  };

  const handleToggleBookmark = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSaved(prompt.id);
  };

  const Heading = headingLevel;

  return (
    <Link className="study-card" to={to}>
      <div className="study-card-media">
        <img
          src={assetUrl(prompt.referenceImage)}
          alt={prompt.title}
          loading="lazy"
        />
        <div className="card-actions">
          <button
            type="button"
            className={`card-action-btn copy-btn ${copied ? "is-copied" : ""}`}
            title={copied ? "Copied!" : "Copy prompt"}
            aria-label={
              copied
                ? `Copied prompt for Study ${prompt.studyNumber}`
                : `Copy prompt for Study ${prompt.studyNumber}`
            }
            onClick={handleCopy}
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
              {copied ? "Copied!" : "Copy prompt"}
            </span>
          </button>
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
              title={`Filter by ${t}`}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
