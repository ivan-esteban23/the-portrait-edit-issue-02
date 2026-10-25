import { useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Issue } from "@/content/schema";
import { assetUrl } from "@/content";
import { Button } from "../ui/button";

interface ReaderChapterDrawerProps {
  issue: Issue;
  page: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: number) => void;
}

export function ReaderChapterDrawer({
  issue,
  page,
  isOpen,
  onClose,
  onSelect,
}: ReaderChapterDrawerProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="chapter-drawer-scrim">
          <DialogPrimitive.Content
            className="chapter-drawer"
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              closeButton.current?.focus({ preventScroll: true });
            }}
          >
            <header className="chapter-drawer-header">
              <div>
                <p className="eyebrow">Issue {issue.number} · Index</p>
                <DialogPrimitive.Title asChild>
                  <h2>Table of contents</h2>
                </DialogPrimitive.Title>
              </div>
              <Button
                variant="ghost"
                ref={closeButton}
                aria-label="Close table of contents"
                onClick={onClose}
              >
                ✕
              </Button>
            </header>
            <ol className="chapter-drawer-list">
              {issue.chapters.map((chapter, index) => {
                const total = chapter.endPage - chapter.startPage + 1;
                const read = Math.max(
                  0,
                  Math.min(total, page - chapter.startPage + 1),
                );
                return (
                  <li key={`${chapter.startPage}-${chapter.title}`}>
                    <button
                      type="button"
                      className="chapter-drawer-item"
                      aria-current={
                        page >= chapter.startPage && page <= chapter.endPage
                          ? "location"
                          : undefined
                      }
                      onClick={() => onSelect(chapter.startPage)}
                    >
                      <img
                        src={assetUrl(
                          `${issue.pageDirectory}/${String(chapter.startPage).padStart(3, "0")}.webp`,
                        )}
                        alt={`${chapter.title} chapter opener, page ${chapter.startPage}`}
                        loading="lazy"
                      />
                      <span className="chapter-drawer-copy">
                        <span className="chapter-drawer-kicker">
                          Chapter {String(index + 1).padStart(2, "0")} · Opens
                          p. {chapter.startPage}
                        </span>
                        <strong>{chapter.title}</strong>
                        <span className="chapter-drawer-range">
                          Pages {chapter.startPage}–{chapter.endPage}
                        </span>
                        <span
                          className="chapter-drawer-progress"
                          role="progressbar"
                          aria-label={`${chapter.title} reading progress`}
                          aria-valuenow={read}
                          aria-valuemin={0}
                          aria-valuemax={total}
                        >
                          <i style={{ width: `${(read / total) * 100}%` }} />
                        </span>
                        <small>
                          {read} of {total} pages read
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
