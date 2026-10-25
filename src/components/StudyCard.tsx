import { Icon } from "@/components/ui/Icon";
import { useState, useRef, useEffect, useId, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { Prompt } from "@/content/schema";
import { cardImageUrl } from "@/content";
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
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
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
  onOpen,
}: StudyCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string>("Copied!");
  const [copyErrorText, setCopyErrorText] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsId = useId();
  const actionsRef = useRef<HTMLDivElement>(null);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copyRequest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    setCopied(false);
    setCopyErrorText(null);
    return () => {
      copyRequest.current += 1;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [prompt.id]);

  const handleCopy = async (e: MouseEvent, format: CopyFormat = "raw") => {
    e.preventDefault();
    e.stopPropagation();
    const current = ++copyRequest.current;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (menuOpen) closeMenu();
    const text = formatPromptText(prompt, format);
    try {
      await copyText(text);
      if (current !== copyRequest.current) return;
      setCopyErrorText(null);
      setCopied(true);
      setCopiedFormat(
        format === "raw"
          ? "Copied!"
          : format === "params"
            ? "Copied +Params!"
            : "Copied MD!",
      );
      timer.current = setTimeout(() => {
        if (current === copyRequest.current) {
          setCopied(false);
        }
      }, 1600);
    } catch {
      if (current !== copyRequest.current) return;
      setCopied(false);
      setCopyErrorText(text);
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
          src={cardImageUrl(prompt.referenceImage)}
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
          if (event.key === "Escape" && menuOpen) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
          }
        }}
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            actionsRef.current?.contains(event.relatedTarget)
          ) {
            return;
          }
          setMenuOpen(false);
        }}
      >
        <button
          type="button"
          className={`card-action-btn copy-btn ${copied ? "is-copied" : ""} ${copyErrorText !== null ? "is-copy-failed" : ""}`}
          title={
            copied
              ? copiedFormat
              : copyErrorText !== null
                ? "Copy unavailable"
                : "Copy prompt"
          }
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
      {(copied || copyErrorText !== null) && (
        <div
          className={`study-card-copy-feedback${copyErrorText !== null ? " is-visible" : ""}`}
        >
          <p
            className={
              copyErrorText !== null ? "study-card-copy-error" : "sr-only"
            }
            role="status"
            aria-live="polite"
          >
            {copyErrorText !== null
              ? `Copy unavailable for Study ${prompt.studyNumber}. Select the prompt text below to copy it.`
              : `${copiedFormat} Study ${prompt.studyNumber} prompt.`}
          </p>
          {copyErrorText !== null && (
            <input
              type="text"
              className="study-card-manual-copy"
              aria-label={`Prompt to copy for Study ${prompt.studyNumber}`}
              readOnly
              value={copyErrorText}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.select();
              }}
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
        </div>
      )}
      <Link
        className="study-card-overlay"
        data-study-id={prompt.id}
        to={to}
        aria-label={`View study ${prompt.title || prompt.id}`}
        onClick={(e) => {
          if (selectionMode) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect?.(prompt.id);
          } else {
            onOpen?.(e);
          }
        }}
      />
    </article>
  );
}
