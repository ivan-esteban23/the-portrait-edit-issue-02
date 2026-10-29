import { IconText } from "@/components/ui/IconText";
import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { assetUrl, currentIssue, issues, prompts, readerPath } from "@/content";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/hooks/usePageMeta";

export function IssueOverviewPage() {
  const { slug } = useParams();
  const { hash } = useLocation();
  const chapterHeading = useRef<HTMLHeadingElement>(null);
  const browseChapters = useCallback(() => {
    const heading = chapterHeading.current;
    if (!heading) return;
    const masthead = document.querySelector<HTMLElement>(".masthead");
    const headerHeight =
      masthead &&
      ["sticky", "fixed"].includes(getComputedStyle(masthead).position)
        ? masthead.getBoundingClientRect().height
        : 0;
    heading.style.scrollMarginTop = `${headerHeight + 16}px`;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
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
  useEffect(() => {
    if (hash !== "#issue-chapters") return;
    const frame = requestAnimationFrame(browseChapters);
    return () => cancelAnimationFrame(frame);
  }, [hash, issue?.slug, browseChapters]);
  if (!issue) return <NotFoundPage />;
  const issueStudies = prompts.filter((p) => p.issueSlug === issue.slug);

  return (
    <section className="overview">
      <header>
        <p className="eyebrow">Issue {issue.number}</p>
        <h1>{issue.title}</h1>
        <Button asChild variant="outline" className="overview-chapter-link">
          <Link
            to="#issue-chapters"
            onClick={(event) => {
              if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.shiftKey
              )
                browseChapters();
            }}
          >
            <IconText>Browse chapters ↓</IconText>
          </Link>
        </Button>
        <p className="editorial-intro">{issue.description}</p>
      </header>
      <div className="overview-grid">
        <div>
          <div className="hero-actions">
            <Button asChild variant="default">
              <Link to={readerPath(issue.slug, lastReadPage)}>
                <IconText>
                  {lastReadPage > 1
                    ? `Resume reading (Page ${lastReadPage}) ↗`
                    : "Start reading"}
                </IconText>
              </Link>
            </Button>
            {lastReadPage > 1 && (
              <Button asChild variant="outline">
                <Link to={readerPath(issue.slug)}>Start from beginning</Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="print-contact-sheet-btn"
              onClick={() => window.print()}
              title="Print editorial contact sheet"
            >
              <Icon name="print" />
              Print contact sheet
            </Button>
            <a href={issue.pdfUrl}>
              <IconText>
                Download PDF · {(issue.pdfBytes / 1e6).toFixed(1)} MB ↗
              </IconText>
            </a>
          </div>
          <img
            className="overview-cover"
            src={assetUrl(issue.cover)}
            alt={`${issue.title} cover`}
          />
        </div>
        <nav className="chapter-directory" aria-label="Issue chapters">
          <h2 id="issue-chapters" ref={chapterHeading} tabIndex={-1}>
            Chapters
          </h2>
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
