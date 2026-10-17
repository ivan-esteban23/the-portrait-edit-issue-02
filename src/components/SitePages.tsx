import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { assetUrl, currentIssue, issues, prompts, readerPath } from "@/content";
import { Button } from "./ui/button";
import { Study } from "./Study";
import { StudyCard } from "./StudyCard";
import { useBookmarks } from "@/hooks/useBookmarks";
import { CompareLab } from "./CompareLab";
import { ImageLightbox } from "./ImageLightbox";
export function Home() {
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
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useBookmarks();
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
              <Link to={readerPath(currentIssue.slug)}>Start reading ↗</Link>
            </Button>
            <Link to={`/issues/${currentIssue.slug}`}>Inside the issue</Link>
          </div>
        </div>
        <Link
          className="hero-cover"
          to={readerPath(currentIssue.slug)}
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
              onTagClick={(t) => navigate(`/prompts?tag=${encodeURIComponent(t)}`)}
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
  if (!issue) return <NotFound />;
  const issueStudies = prompts.filter((p) => p.issueSlug === issue.slug);
  const { isSaved, toggleSaved } = useBookmarks();

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
              <Link to={readerPath(issue.slug)}>Start reading</Link>
            </Button>
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
          <h2>THE PORTRAIT EDIT — ISSUE {issue.number}: {issue.title.toUpperCase()}</h2>
          <span>EDITORIAL CONTACT SHEET</span>
        </div>
        <div className="print-header-details">
          <p>
            Publication Issue: <strong>Issue {issue.number} — {issue.title}</strong>
          </p>
          <p>
            {issueStudies.length} {issueStudies.length === 1 ? "study" : "studies"} · Printed{" "}
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

  const query = search.get("q") ?? "",
    tag = search.get("tag") ?? "",
    model = search.get("model") ?? "",
    savedOnly = search.get("saved") === "1";
  const tags = [...new Set(prompts.flatMap((p) => p.tags))].sort();
  const models = [
    ...new Set(prompts.map((p) => p.model ?? "Unspecified")),
  ].sort();
  const filtered = prompts.filter(
    (p) =>
      (!savedOnly || isSaved(p.id)) &&
      (!tag || p.tags.includes(tag)) &&
      (!model || (p.model ?? "Unspecified") === model) &&
      `${p.title} ${p.prompt} ${p.style} ${p.studyNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  function filter(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next, { replace: true });
  }

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
    <section className="archive">
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
            onClick={() => {
              if (savedCount > 0 && !savedOnly) {
                filter("saved", "1");
              }
              setTimeout(() => {
                window.print();
              }, 120);
            }}
            title="Print editorial contact sheet (@media print)"
          >
            Print Contact Sheet 🖨
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
          <Button variant="ghost" onClick={() => setSearch({})}>
            Clear filters
          </Button>
        </div>
      </form>
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
            Curated Collection: <strong>{activeCollection}</strong>
          </p>
          <p>
            {filtered.length} {filtered.length === 1 ? "study" : "studies"} · Printed{" "}
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
        <aside className="compare-floating-dock" aria-label="Compare selection dock">
          <div className="compare-dock-content">
            <span className="compare-dock-count">
              Selected {compareIds.length}/2 for comparison
            </span>
            <div className="compare-dock-actions">
              <Button
                type="button"
                variant="default"
                disabled={compareIds.length < 2}
                onClick={() => setCompareOpen(true)}
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

      {/* Compare Lab Modal */}
      {compareOpen && studyA && studyB && (
        <CompareLab
          studyA={studyA}
          studyB={studyB}
          isOpen={compareOpen}
          onClose={() => setCompareOpen(false)}
          onSwap={() => setCompareIds([compareIds[1], compareIds[0]])}
          onInspectImage={(src, alt, title) => setLightbox({ src, alt, title })}
        />
      )}

      {/* Lightbox for inspect triggers */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          title={lightbox.title}
          isOpen={Boolean(lightbox)}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
export function StudyPage() {
  const { id } = useParams();
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
