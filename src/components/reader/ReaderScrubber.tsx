import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Issue } from "@/content/schema";
import { Button } from "../ui/button";
import { ThumbnailFilmstrip } from "./ThumbnailFilmstrip";

interface ReaderScrubberProps {
  issue: Issue;
  page: number;
  firstVisible: number;
  lastVisible: number;
  go: (page: number) => void;
  getCurrentPage: () => number;
  showThumbnails: boolean;
  setShowThumbnails: Dispatch<SetStateAction<boolean>>;
}

export function ReaderScrubber({
  issue,
  page,
  firstVisible,
  lastVisible,
  go,
  getCurrentPage,
  showThumbnails,
  setShowThumbnails,
}: ReaderScrubberProps) {
  const [preview, setPreview] = useState(page);
  useEffect(() => setPreview(page), [page]);
  const pages = useMemo(
    () => Array.from({ length: issue.pages }, (_, i) => i + 1),
    [issue.pages],
  );
  const commit = () => go(Number(preview));
  return (
    <div className="scrubber">
      <div className="scrubber-header">
        <div className="scrubber-label">
          <label htmlFor="page-range">Browse the issue</label>
          <output htmlFor="page-range" aria-live="off">
            Page {preview} of {issue.pages}
          </output>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="filmstrip-toggle-btn"
          aria-expanded={showThumbnails}
          aria-label="Toggle page thumbnails"
          onClick={() => setShowThumbnails((v) => !v)}
        >
          {showThumbnails ? "Hide thumbnails" : "Thumbnails"}
        </Button>
      </div>
      {showThumbnails && (
        <ThumbnailFilmstrip
          pages={pages}
          currentPageIndex={page - 1}
          pageDirectory={issue.pageDirectory}
          onPageSelect={go}
        />
      )}
      <div className="range-track">
        <input
          id="page-range"
          aria-label="Browse pages"
          type="range"
          min={1}
          max={issue.pages}
          value={preview}
          aria-valuetext={`Page ${preview} of ${issue.pages}`}
          onChange={(e) => setPreview(Number(e.target.value))}
          onPointerUp={(e) => {
            go(Number(e.currentTarget.value));
          }}
          onPointerCancel={() => setPreview(page)}
          onKeyUp={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "PageUp",
                "PageDown",
              ].includes(e.key)
            )
              commit();
          }}
          onBlur={() => {
            if (preview !== page) commit();
          }}
        />
        <div className="chapter-ticks" aria-hidden="true">
          {issue.chapters.map((c) => (
            <i
              key={c.startPage}
              style={{
                left: `${(100 * (c.startPage - 1)) / (issue.pages - 1)}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="quick-steps">
        <Button
          variant="ghost"
          disabled={firstVisible === 1}
          onClick={() => go(getCurrentPage() - 10)}
        >
          −10 pages
        </Button>
        <span>Marks show chapter openings</span>
        <Button
          variant="ghost"
          disabled={lastVisible === issue.pages}
          onClick={() => go(getCurrentPage() + 10)}
        >
          +10 pages
        </Button>
      </div>
    </div>
  );
}
