import { Link, useParams } from "react-router-dom";
import { assetUrl, currentIssue, issues, prompts, readerPath } from "@/content";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/hooks/usePageMeta";

export function IssueOverviewPage() {
  const { slug } = useParams();
  const issue = issues.find((i) => i.slug === slug);
  const lastReadPage = useLastReadPage(issue);
  const { isSaved, toggleSaved } = useBookmarks();
  usePageMeta({
    title: issue
      ? `Issue ${issue.number} — ${issue.title} | The Portrait Edit`
      : "Page not found | The Portrait Edit",
    description: issue?.description,
    image: assetUrl(issue?.cover ?? currentIssue.cover),
    path: issue ? `/issues/${issue.slug}` : undefined,
  });
  if (!issue) return <NotFoundPage />;
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
