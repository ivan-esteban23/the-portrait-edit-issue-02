import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { assetUrl, currentIssue, issues, prompts, readerPath } from "@/content";
import { Button } from "./ui/button";
import { Study } from "./Study";
import { StudyCard } from "./StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { splitPromptParameters } from "@/lib/promptFormatter";
import { copyText } from "@/lib/utils";
import { generateMarkdownDossier, downloadFile } from "@/lib/dossier";

type ParsedParameters = ReturnType<typeof splitPromptParameters>;

const CompareLab = lazy(() =>
  import("./CompareLab").then((m) => ({ default: m.CompareLab })),
);
const ImageLightbox = lazy(() =>
  import("./ImageLightbox").then((m) => ({ default: m.ImageLightbox })),
);

export function Home() {
  const lastReadPage = useLastReadPage(currentIssue);
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useBookmarks();
  const legacy = window.location.hash.match(/^#page=(\d+)$/);
  if (window.location.hash === "#reader")
    return (
      <Navigate
        replace
        to={readerPath(currentIssue.slug) + window.location.search}
      />
    );
  if (legacy)
    return (
      <Navigate
        replace
        to={
          readerPath(
            currentIssue.slug,
            Math.min(currentIssue.pages, Math.max(1, Number(legacy[1]))),
          ) + window.location.search
        }
      />
    );
  const featured = currentIssue.featured.map((id) =>
    prompts.find((p) => p.id === id)!,
  );
  return (
    <>
      <section className="home-hero">
        <div>
          <p className="eyebrow">
            Issue {currentIssue.number} / A portrait archive
          </p>
          <h1>
            The
            <br />
            <em>Prompt</em> Issue
          </h1>
          <p className="hero-deck">{currentIssue.description}</p>
          <p className="issue-stats">
            {currentIssue.studies} studies <span>·</span> {currentIssue.pages}{" "}
            pages <span>·</span> {currentIssue.chapters.length} chapters
          </p>
          <div className="hero-actions">
            <Button asChild variant="default">
              <Link to={readerPath(currentIssue.slug, lastReadPage)}>
                {lastReadPage > 1
                  ? `Resume reading · Page ${lastReadPage} ↗`
                  : "Start reading ↗"}
              </Link>
            </Button>
            {lastReadPage > 1 && (
              <Button asChild variant="outline">
                <Link to={readerPath(currentIssue.slug)}>
                  Start from beginning
                </Link>
              </Button>
            )}
            <Link to={`/issues/${currentIssue.slug}`}>Inside the issue</Link>
          </div>
        </div>
        <Link
          className="hero-cover"
          to={readerPath(currentIssue.slug, lastReadPage)}
          aria-label="Read The Prompt Issue"
        >
          <img
            src={assetUrl(currentIssue.cover)}
            width="480"
            height="622"
            alt="The Portrait Edit — Issue 02 cover"
          />
          <span>Issue 02 — The Prompt Issue</span>
        </Link>
      </section>
      <section className="selected-section">
        <div className="section-title">
          <h2>From the archive</h2>
          <Link to="/prompts">All studies ↗</Link>
        </div>
        <div className="selected-strip">
          {featured.map((p) => (
            <StudyCard
              key={p.id}
              prompt={p}
              to={readerPath(p.issueSlug, p.page)}
              headingLevel="h3"
              isSaved={isSaved(p.id)}
              onToggleSaved={toggleSaved}
              onTagClick={(t) =>
                navigate(`/prompts?tag=${encodeURIComponent(t)}`)
              }
            />
          ))}
        </div>
      </section>
    </>
  );
}
export function IssueOverview() {
  const { slug } = useParams();
  const issue = issues.find((i) => i.slug === slug);
  const lastReadPage = useLastReadPage(issue);
  const { isSaved, toggleSaved } = useBookmarks();
  if (!issue) return <NotFound />;
  const issueStudies = prompts.filter((p) => p.issueSlug === issue.slug);

  return (
    <section className="overview">
      <header>
        <p className="eyebrow">Issue {issue.number}</p>
        <h1>{issue.title}</h1>
        <p className="editorial-intro">{issue.description}</p>
      </header>
      <div className="overview-grid">
        <div>
          <img
            className="overview-cover"
            src={assetUrl(issue.cover)}
            alt={`${issue.title} cover`}
          />
          <div className="hero-actions">
            <Button asChild variant="default">
              <Link to={readerPath(issue.slug, lastReadPage)}>
                {lastReadPage > 1
                  ? `Resume reading (Page ${lastReadPage}) ↗`
                  : "Start reading"}
              </Link>
            </Button>
            {lastReadPage > 1 && (
              <Button asChild variant="outline">
                <Link to={readerPath(issue.slug)}>Start from beginning</Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="print-contact-sheet-btn"
              onClick={() => window.print()}
              title="Print editorial contact sheet (@media print)"
            >
              Print Contact Sheet 🖨
            </Button>
            <a href={issue.pdfUrl}>
              Download PDF · {(issue.pdfBytes / 1e6).toFixed(1)} MB ↗
            </a>
          </div>
        </div>
        <nav className="chapter-directory" aria-label="Issue chapters">
          <Link to={readerPath(issue.slug)}>
            <span>Front matter</span>
            <span>1–{issue.chapters[0].startPage - 1}</span>
          </Link>
          {issue.chapters.map((c, i) => (
            <Link key={c.startPage} to={readerPath(issue.slug, c.startPage)}>
              <span>
                <small>{String(i + 1).padStart(2, "0")}</small> {c.title}
              </span>
              <span>
                {c.startPage}–{c.endPage}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Printable Contact Sheet Header (@media print) */}
      <div className="print-contact-sheet-header" aria-hidden="true">
        <div className="print-header-masthead">
          <h2>
            THE PORTRAIT EDIT — ISSUE {issue.number}:{" "}
            {issue.title.toUpperCase()}
          </h2>
          <span>EDITORIAL CONTACT SHEET</span>
        </div>
        <div className="print-header-details">
          <p>
            Publication Issue:{" "}
            <strong>
              Issue {issue.number} — {issue.title}
            </strong>
          </p>
          <p>
            {issueStudies.length}{" "}
            {issueStudies.length === 1 ? "study" : "studies"} · Printed{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="issue-print-studies" aria-hidden="true">
        {issueStudies.map((p) => (
          <StudyCard
            key={p.id}
            prompt={p}
            to={readerPath(p.issueSlug, p.page)}
            headingLevel="h3"
            isSaved={isSaved(p.id)}
            onToggleSaved={toggleSaved}
          />
        ))}
      </div>
    </section>
  );
}
export function Archive() {
  const archive = useRef<HTMLElement>(null);
  const [preparingPrint, setPreparingPrint] = useState(false);
  async function printSelection() {
    setPreparingPrint(true);
    try {
      const images = Array.from(
        archive.current?.querySelectorAll<HTMLImageElement>(
          ".archive-grid img",
        ) || [],
      );
      images.forEach((image) => {
        image.loading = "eager";
      });
      await Promise.allSettled(images.map((image) => image.decode?.()));
      await document.fonts?.ready;
      window.print();
    } finally {
      setPreparingPrint(false);
    }
  }
  const [search, setSearch] = useSearchParams();
  const {
    isSaved,
    toggleSaved,
    exportSaved,
    exportMarkdown,
    savedCount,
    activeCollection,
    setActiveCollection,
    createCollection,
    collections,
  } = useBookmarks();

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [newColName, setNewColName] = useState("");
  const [showNewCol, setShowNewCol] = useState(false);

  // Multi-select batch actions state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchCopied, setBatchCopied] = useState(false);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  const query = search.get("q") ?? "",
    tag = search.get("tag") ?? "",
    model = search.get("model") ?? "",
    aspectRatio = search.get("ar") ?? "",
    savedOnly = search.get("saved") === "1";

  const hasActiveFilters = Boolean(
    query || tag || model || aspectRatio || savedOnly,
  );

  const tags = useMemo(
    () => [...new Set(prompts.flatMap((p) => p.tags))].sort(),
    [],
  );

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      p.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, []);

  const parsedParameters = useMemo(
    () =>
      new Map<string, ParsedParameters>(
        prompts.map((p) => [p.id, splitPromptParameters(p.prompt)]),
      ),
    [],
  );

  const aspectRatios = useMemo(() => {
    const set = new Set<string>(["1:1", "4:5", "16:9"]);
    prompts.forEach((p) => {
      const rawAr =
        p.parameters?.["ar"] ||
        p.parameters?.["--ar"] ||
        parsedParameters.get(p.id)?.parameters.get("ar");
      if (rawAr && rawAr !== "Unspecified") {
        set.add(String(rawAr).trim());
      }
    });
    return Array.from(set).sort();
  }, [parsedParameters]);

  const models = useMemo(
    () => [...new Set(prompts.map((p) => p.model ?? "Unspecified"))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (savedOnly && !isSaved(p.id)) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (model && (p.model ?? "Unspecified") !== model) return false;
      if (aspectRatio) {
        const pAr =
          p.parameters?.["ar"] ||
          p.parameters?.["--ar"] ||
          parsedParameters.get(p.id)?.parameters.get("ar") ||
          "4:5";
        if (String(pAr).trim() !== aspectRatio) return false;
      }
      if (
        query &&
        !`${p.title} ${p.prompt} ${p.style} ${p.studyNumber}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [savedOnly, isSaved, tag, model, aspectRatio, query, parsedParameters]);

  function filter(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next, { replace: true });
  }

  const toggleSelectPrompt = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds(filtered.map((p) => p.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const copySelectedPrompts = async () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const combined = selectedPrompts.map((p) => p.prompt).join("\n\n");
    await copyText(combined);
    setBatchCopied(true);
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(() => setBatchCopied(false), 2000);
  };

  const exportSelectedDossier = () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const markdown = generateMarkdownDossier(selectedPrompts);
    const date = new Date().toISOString().split("T")[0];
    downloadFile(
      `portrait-edit-dossier-${date}.md`,
      markdown,
      "text/markdown;charset=utf-8",
    );
  };

  const exportSelectedJson = () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const date = new Date().toISOString().split("T")[0];
    downloadFile(
      `portrait-edit-selection-${date}.json`,
      JSON.stringify(selectedPrompts, null, 2),
      "application/json",
    );
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const studyA = prompts.find((p) => p.id === compareIds[0]);
  const studyB = prompts.find((p) => p.id === compareIds[1]);

  return (
    <section className="archive" ref={archive}>
      <header>
        <p className="eyebrow">The working collection</p>
        <h1>Portrait prompts</h1>
        <p className="editorial-intro">
          References, language, and the decisions behind an image.
        </p>
      </header>
      <form className="archive-filters" onSubmit={(e) => e.preventDefault()}>
        <label>
          Search
          <input
            type="search"
            placeholder="Light, texture, study number…"
            value={query}
            onChange={(e) => filter("q", e.target.value)}
          />
        </label>
        <label>
          Style / tag
          <select value={tag} onChange={(e) => filter("tag", e.target.value)}>
            <option value="">All styles</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Model
          <select
            value={model}
            onChange={(e) => filter("model", e.target.value)}
          >
            <option value="">All models</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Aspect Ratio
          <select
            value={aspectRatio}
            onChange={(e) => filter("ar", e.target.value)}
          >
            <option value="">All aspect ratios</option>
            {aspectRatios.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </label>
        <div className="archive-actions-group">
          <Button
            type="button"
            variant="ghost"
            className={`saved-pill-btn ${savedOnly ? "is-active" : ""}`}
            aria-pressed={savedOnly}
            onClick={() => filter("saved", savedOnly ? "" : "1")}
          >
            ★ Saved ({savedCount})
          </Button>

          {/* Multi-Select Batch Mode Toggle */}
          <Button
            type="button"
            variant="ghost"
            className={`selection-mode-toggle-btn ${selectionMode ? "is-active" : ""}`}
            aria-pressed={selectionMode}
            aria-label={selectionMode ? "Cancel Selection" : "Select Prompts"}
            onClick={() => {
              setSelectionMode((prev) => {
                if (prev) setSelectedIds([]);
                return !prev;
              });
            }}
          >
            {selectionMode ? "Cancel Selection" : "Select Prompts"}
          </Button>

          {selectionMode && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={selectAllFiltered}
                aria-label="Select All Filtered"
              >
                Select All ({filtered.length})
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearSelection}
                  aria-label="Clear Selection"
                >
                  Clear Selection
                </Button>
              )}
            </>
          )}

          {/* Collection Moodboard Selector */}
          <label className="moodboard-select-label">
            <span className="sr-only">Collection</span>
            <select
              aria-label="Moodboard collection"
              value={activeCollection}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCol(true);
                } else {
                  setActiveCollection(e.target.value);
                }
              }}
            >
              {collections.map((c) => (
                <option key={c} value={c}>
                  Collection: {c}
                </option>
              ))}
              <option value="__new__">+ New Collection…</option>
            </select>
          </label>

          {showNewCol && (
            <div className="new-collection-inline">
              <input
                type="text"
                placeholder="Collection name…"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newColName.trim()) {
                      createCollection(newColName.trim());
                      setNewColName("");
                      setShowNewCol(false);
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (newColName.trim()) {
                    createCollection(newColName.trim());
                    setNewColName("");
                    setShowNewCol(false);
                  }
                }}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewCol(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            className="export-saved-btn print-contact-sheet-btn"
            onClick={printSelection}
            disabled={preparingPrint || filtered.length === 0}
            aria-busy={preparingPrint}
            title="Print editorial contact sheet (@media print)"
          >
            {preparingPrint ? "Preparing sheet…" : "Print Contact Sheet 🖨"}
          </Button>

          {savedCount > 0 && (
            <>
              <Button
                type="button"
                variant="ghost"
                className="export-saved-btn"
                onClick={exportSaved}
                title="Export saved studies as JSON"
              >
                Export JSON ↗
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="export-saved-btn"
                onClick={exportMarkdown}
                title="Export collection as Markdown"
              >
                Export Markdown ↗
              </Button>
            </>
          )}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              className="reset-filters-btn"
              onClick={() => setSearch({})}
              aria-label="Reset all filters"
            >
              Reset all filters ✕
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSearch({})}>
            Clear filters
          </Button>
        </div>
      </form>

      {/* Interactive Tag Pills */}
      <div
        className="archive-tag-pills"
        role="region"
        aria-label="Tag filters"
      >
        <span className="tag-pills-label">Tags:</span>
        <div className="tag-pills-scroll">
          {tagCounts.slice(0, 16).map(({ name, count }) => {
            const isActive = tag === name;
            return (
              <button
                key={name}
                type="button"
                className={`tag-pill ${isActive ? "is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() => filter("tag", isActive ? "" : name)}
              >
                #{name} <span className="tag-pill-count">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <p role="status" className="results-count">
        {filtered.length} {filtered.length === 1 ? "study" : "studies"}
      </p>

      {/* Printable Contact Sheet Header (@media print) */}
      <div className="print-contact-sheet-header" aria-hidden="true">
        <div className="print-header-masthead">
          <h2>THE PORTRAIT EDIT — ISSUE 02: THE PROMPT ISSUE</h2>
          <span>EDITORIAL CONTACT SHEET</span>
        </div>
        <div className="print-header-details">
          <p>
            {savedOnly ? (
              <>
                Curated Collection: <strong>{activeCollection}</strong>
              </>
            ) : (
              <strong>Archive selection</strong>
            )}
            {tag && ` · #${tag}`}
            {model && ` · ${model}`}
            {aspectRatio && ` · ${aspectRatio}`}
            {query && ` · “${query}”`}
          </p>
          <p>
            {filtered.length} {filtered.length === 1 ? "study" : "studies"} ·
            Printed{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="print-header-line" />
      </div>

      <div className="archive-grid">
        {filtered.map((p) => (
          <StudyCard
            key={p.id}
            prompt={p}
            to={`/prompts/${p.id}`}
            headingLevel="h2"
            isSaved={isSaved(p.id)}
            onToggleSaved={toggleSaved}
            onTagClick={(t) => filter("tag", t)}
            isComparing={compareIds.includes(p.id)}
            onToggleCompare={toggleCompare}
            selectionMode={selectionMode}
            isSelected={selectedIds.includes(p.id)}
            onToggleSelect={toggleSelectPrompt}
          />
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          {savedOnly && savedCount === 0
            ? "No studies saved yet. Tap the bookmark icon on any study to add it to your curation board."
            : "No studies match these filters. Try a broader search or clear the filters."}
        </p>
      )}

      {/* Floating comparison dock */}
      {compareIds.length > 0 && (
        <aside
          className="compare-floating-dock"
          aria-label="Compare selection dock"
        >
          <div className="compare-dock-content">
            <span className="compare-dock-count">
              Selected {compareIds.length}/2 for comparison
            </span>
            <div className="compare-dock-actions">
              <Button
                type="button"
                variant="default"
                disabled={compareIds.length < 2}
                onClick={(event) => {
                  event.currentTarget.focus();
                  setCompareOpen(true);
                }}
                className="dock-compare-btn"
              >
                Compare 2 studies ⇄
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCompareIds([])}
                className="dock-clear-btn"
              >
                Clear
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Floating Batch Selection Toolbar */}
      {selectedIds.length > 0 && (
        <aside
          className="batch-floating-toolbar"
          role="region"
          aria-label="Batch actions toolbar"
        >
          <div className="batch-toolbar-content">
            <span className="batch-toolbar-count">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "prompt" : "prompts"} selected
            </span>
            <div className="batch-toolbar-actions">
              <Button
                type="button"
                variant="default"
                className="batch-copy-btn"
                onClick={copySelectedPrompts}
                aria-label="Copy Prompts"
              >
                {batchCopied ? "Copied!" : "Copy Prompts"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="batch-dossier-btn"
                onClick={exportSelectedDossier}
                aria-label="Export Markdown Dossier"
                title="Download curated Markdown dossier (.md)"
              >
                Export Markdown Dossier ↗
              </Button>
              <Button
                type="button"
                variant="outline"
                className="batch-json-btn"
                onClick={exportSelectedJson}
                aria-label="Export JSON"
                title="Download selection as JSON (.json)"
              >
                Export JSON ↗
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="batch-clear-btn"
                onClick={clearSelection}
                aria-label="Clear"
              >
                Clear
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Compare Lab Modal */}
      {compareOpen && studyA && studyB && (
        <Suspense fallback={null}>
          <CompareLab
            studyA={studyA}
            studyB={studyB}
            isOpen={compareOpen}
            onClose={() => setCompareOpen(false)}
            onSwap={() => setCompareIds([compareIds[1], compareIds[0]])}
            onInspectImage={(src, alt, title) =>
              setLightbox({ src, alt, title })
            }
          />
        </Suspense>
      )}

      {/* Lightbox for inspect triggers */}
      {lightbox && (
        <Suspense fallback={null}>
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            title={lightbox.title}
            isOpen={Boolean(lightbox)}
            onClose={() => setLightbox(null)}
          />
        </Suspense>
      )}
    </section>
  );
}
export function StudyPage() {
  const { id } = useParams();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  const prompt = prompts.find((p) => p.id === id);
  if (!prompt) return <NotFound />;
  return (
    <section className="standalone-study">
      <div className="study-links">
        <Link to="/prompts">← Prompt archive</Link>
        <Link to={readerPath(prompt.issueSlug, prompt.page)}>
          Read in the issue ↗
        </Link>
      </div>
      <Study key={prompt.id} prompt={prompt} />
      <aside className="parameters">
        <h3>Study record</h3>
        <dl>
          <div>
            <dt>Model</dt>
            <dd>{prompt.model ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{prompt.date ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt>Parameters</dt>
            <dd>
              {Object.keys(prompt.parameters).length
                ? Object.entries(prompt.parameters)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")
                : "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>Style tags</dt>
            <dd>{prompt.tags.join(" · ")}</dd>
          </div>
        </dl>
        <p>
          Review flags describe the published record; they do not establish
          rights or publication clearance.
        </p>
      </aside>
    </section>
  );
}
export function About() {
  return (
    <article className="about editorial-copy">
      <p className="eyebrow">About the publication</p>
      <h1>
        Looking closely.
        <br />
        <em>Writing precisely.</em>
      </h1>
      <section>
        <h2>Editorial statement</h2>
        <p>
          The Portrait Edit is an independent editorial magazine and working
          archive of AI portrait prompts. It brings reference images,
          descriptive language, and working notes together so readers can study
          how light, texture, styling, and composition are articulated.
        </p>
      </section>
      <section>
        <h2>Methodology</h2>
        <p>
          Each study preserves its published prompt, reference, and notes. The
          archive treats those records as a starting point for close reading and
          experimentation. Style tags are drawn from the existing style
          descriptions; unknown model versions, parameters, and dates remain
          unrecorded.
        </p>
        <p>
          Repeated studies and pairing or rights-review flags remain visible. A
          text verification means the prompt matches the published source, not
          that a reference has been cleared for reuse.
        </p>
      </section>
      <section>
        <h2>Contact & source</h2>
        <p>
          For editorial questions or corrections, use the{" "}
          <a href="https://github.com/ivan-esteban23/the-portrait-edit-issue-02/issues">
            publication’s GitHub issue tracker
          </a>
          .
        </p>
        <p>
          <a href="https://github.com/ivan-esteban23/the-portrait-edit">
            Source & production notes ↗
          </a>
        </p>
      </section>
    </article>
  );
}
export function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Outside the issue</p>
      <h1>
        This page isn’t
        <br />
        in the archive.
      </h1>
      <p>The page or study may not exist. The magazine is still here.</p>
      <Button asChild variant="default">
        <Link to={readerPath(currentIssue.slug)}>Back to the reader</Link>
      </Button>
    </section>
  );
}
