import { useEffect, useState } from "react";
import { assetUrl, pageEyebrow } from "@/content";
import type { Issue } from "@/content/schema";
import { Button } from "../ui/button";

export function RawText({
  page,
  pdfUrl,
  pageDirectory,
}: {
  page: number;
  pdfUrl: string;
  pageDirectory: string;
}) {
  const [text, setText] = useState("Loading page text…");
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setText("Loading page text…");
    setError(false);
    fetch(assetUrl(`${pageDirectory}/${String(page).padStart(3, "0")}.json`), {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("Text unavailable");
        return r.json();
      })
      .then((data: unknown) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("text" in data) ||
          typeof data.text !== "string"
        ) {
          throw new Error("Text unavailable");
        }
        setText(data.text);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(true);
          setText("Page text is unavailable.");
        }
      });
    return () => controller.abort();
  }, [page, pageDirectory]);
  return (
    <div className="raw-page">
      <pre>{text}</pre>
      {error && <a href={pdfUrl}>Download the PDF</a>}
    </div>
  );
}
export function PageFallback({
  page,
  issue,
  label,
  onInspect,
}: {
  page: number;
  issue: Issue;
  label: string;
  onInspect?: (page: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="page-fallback">
      <p className="page-eyebrow">{label}</p>
      <OriginalPage
        page={page}
        issue={issue}
        zoom={100}
        onInspect={onInspect}
      />
      <p className="page-hint">Tap the page to inspect · pinch to zoom</p>
      <details
        className="extracted-text page-text-details"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>Read this page as text</summary>
        {open && (
          <RawText
            page={page}
            pdfUrl={issue.pdfUrl}
            pageDirectory={issue.pageDirectory}
          />
        )}
      </details>
    </div>
  );
}

export function CoverFallback({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        className="reading-cover"
        src={assetUrl(issue.cover)}
        alt={`${issue.title} cover`}
      />
      <details
        className="extracted-text page-text-details"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>Read this page as text</summary>
        {open && (
          <RawText
            page={1}
            pdfUrl={issue.pdfUrl}
            pageDirectory={issue.pageDirectory}
          />
        )}
      </details>
    </>
  );
}

export function OriginalPage({
  page,
  issue,
  zoom,
  onInspect,
}: {
  page: number;
  issue: Issue;
  zoom: number;
  onInspect?: (page: number) => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  return (
    <div className="page-stage" aria-busy={state === "loading"}>
      {state === "loading" && (
        <>
          <div className="loading-line" aria-hidden="true" />
          <span className="sr-only" role="status">
            Loading page {page}
          </span>
        </>
      )}
      {state === "error" && (
        <div className="page-error" role="alert">
          <p>This page could not load.</p>
          <Button
            onClick={() => {
              setState("loading");
              setRetry((r) => r + 1);
            }}
          >
            Retry page
          </Button>
          <a href={issue.pdfUrl}>Download PDF</a>
        </div>
      )}
      <div
        className="page-holder"
        style={{ width: `${zoom}%`, maxWidth: zoom === 100 ? "950px" : "none" }}
      >
        <img
          role="button"
          tabIndex={0}
          aria-label={`Inspect page ${page} in detail`}
          onClick={(event) => {
            event.currentTarget.focus();
            onInspect?.(page);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onInspect?.(page);
            }
          }}
          style={{ cursor: "zoom-in" }}
          key={retry}
          className={state === "ready" ? "page-art loaded" : "page-art"}
          src={assetUrl(
            `${issue.pageDirectory}/${String(page).padStart(3, "0")}.webp${retry ? `?retry=${retry}` : ""}`,
          )}
          width="1224"
          height="1584"
          decoding="async"
          fetchPriority="high"
          alt={`${issue.title} — ${pageEyebrow(issue, page)}, page ${page}`}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          title="Click to inspect page in detail"
        />
      </div>
    </div>
  );
}
export function SpreadPage({
  leftPage,
  rightPage,
  issue,
  zoom,
  onInspect,
}: {
  leftPage: number;
  rightPage: number;
  issue: Issue;
  zoom: number;
  onInspect: (page: number) => void;
}) {
  return (
    <div className="page-stage spread-stage">
      <div
        className="spread-holder"
        style={{
          width: `${zoom}%`,
          maxWidth: zoom === 100 ? "1700px" : "none",
        }}
      >
        <div className="spread-leaf spread-left">
          <OriginalPage
            page={leftPage}
            issue={issue}
            zoom={100}
            onInspect={onInspect}
          />
        </div>
        <div className="spread-spine" aria-hidden="true" />
        {rightPage <= issue.pages && (
          <div className="spread-leaf spread-right">
            <OriginalPage
              page={rightPage}
              issue={issue}
              zoom={100}
              onInspect={onInspect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
