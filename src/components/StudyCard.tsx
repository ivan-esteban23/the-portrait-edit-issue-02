import { Icon } from "@/components/ui/Icon";
import { useState, useRef, useEffect, useId, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";
import {
  formatPromptText,
  canShare,
  sharePrompt,
  type CopyFormat,
} from "@/lib/promptFormatter";

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
  const actionsId = useId();
  const actionsRef = useRef<HTMLDivElement>(null);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => {
    setMenuOpen(false);
    moreTrigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    const dismissOutside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !actionsRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [menuOpen]);
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
    if (menuOpen) closeMenu();
    try {
      const text = formatPromptText(prompt, format);
      await copyText(text);
      setCopied(true);
      setCopiedFormat(
        format === "raw"
          ? "Copied!"
          : format === "params"
            ? "Copied +Params!"
            : "Copied MD!",
      );
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
    closeMenu();
    await sharePrompt(prompt, to);
  };

  const Heading = headingLevel;

  return (
    <article
      className={`study-card ${menuOpen ? "has-open-actions" : ""} ${selectionMode ? "is-selection-mode" : ""} ${isSelected ? "is-selected" : ""}`}
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
      </div>
      <p className="eyebrow">
        Study {String(prompt.studyNumber).padStart(3, "0")}
      </p>
      <Heading>{prompt.title}</Heading>
      {prompt.model && <p className="study-card-model">{prompt.model}</p>}
      {prompt.tags.length === 0 && (
        <p className="study-card-style">{prompt.style}</p>
      )}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="card-tags-list" aria-label="Style tags">
          {prompt.tags.map((t) => (
            <button
              type="button"
              key={t}
              className="tag-badge"
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onTagClick?.(t);
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      <div
        className="card-actions"
        ref={actionsRef}
        role="group"
        aria-label={`Actions for Study ${prompt.studyNumber}`}
        onKeyDown={(event) => {
          if (!menuOpen || event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
        }}
      >
        <button
          type="button"
          className={`card-action-btn copy-btn ${copied ? "is-copied" : ""}`}
          title={copied ? copiedFormat : "Copy prompt"}
          aria-label={`${copied ? "Copied" : "Copy"} prompt for Study ${prompt.studyNumber}`}
          onClick={(event) => handleCopy(event, "raw")}
        >
          {copied ? (
            <span aria-hidden="true">✓</span>
          ) : (
            <Icon name="copy" className="btn-icon-svg" />
          )}
          <span className="action-tooltip">
            {copied ? copiedFormat : "Copy prompt"}
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
          <Icon
            name={isSaved ? "bookmark-filled" : "bookmark"}
            className="btn-icon-svg"
          />
          <span className="action-tooltip">
            {isSaved ? "Saved" : "Save study"}
          </span>
        </button>
        <button
          ref={moreTrigger}
          type="button"
          className={`card-action-btn study-card-more ${isComparing ? "is-comparing" : ""}`}
          title="More actions"
          aria-label={`More actions for Study ${prompt.studyNumber}`}
          aria-expanded={menuOpen}
          aria-controls={actionsId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">···</span>
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            id={actionsId}
            className="study-card-menu"
            role="group"
            aria-label={`More actions for Study ${prompt.studyNumber}`}
          >
            {onToggleCompare && (
              <button
                type="button"
                className="study-card-menu-item compare-btn"
                aria-label={
                  isComparing
                    ? `Remove Study ${prompt.studyNumber} from compare`
                    : `Add Study ${prompt.studyNumber} to compare`
                }
                aria-pressed={isComparing}
                onClick={() => {
                  onToggleCompare(prompt.id);
                  closeMenu();
                }}
              >
                {isComparing ? "Remove from comparison" : "Compare study"}
              </button>
            )}
            <button
              type="button"
              className="study-card-menu-item"
              onClick={(event) => handleCopy(event, "params")}
            >
              Copy with parameters
            </button>
            <button
              type="button"
              className="study-card-menu-item"
              onClick={(event) => handleCopy(event, "markdown")}
            >
              Copy as Markdown
            </button>
            {canShare() && (
              <button
                type="button"
                className="study-card-menu-item"
                aria-label={`Share Study ${prompt.studyNumber}`}
                onClick={handleShare}
              >
                Share study
              </button>
            )}
          </div>
        )}
      </div>
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
