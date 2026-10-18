import { Link, Navigate, useNavigate } from "react-router-dom";
import { assetUrl, currentIssue, prompts, readerPath } from "@/content";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";

export function HomePage() {
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
