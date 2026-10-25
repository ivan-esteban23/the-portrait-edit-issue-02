import { Link } from "react-router-dom";
import { assetUrl, readerPath } from "@/content";
import type { Issue, Prompt } from "@/content/schema";

const pad = (page: number) => String(page).padStart(3, "0");

/**
 * Structured chapter opener for text mode. Replaces the scanned page with a
 * readable title, intro, reference triptych and a direct route into the first
 * study. Pages without this data fall back to the original page image.
 */
export function ChapterOpener({
  issue,
  chapter,
  chapterIndex,
  prompts,
  onInspect,
}: {
  issue: Issue;
  chapter: Issue["chapters"][number];
  chapterIndex: number;
  prompts: Prompt[];
  onInspect: (page: number) => void;
}) {
  const studies = prompts
    .filter(
      (prompt) =>
        prompt.issueSlug === issue.slug &&
        prompt.page >= chapter.startPage &&
        prompt.page <= chapter.endPage,
    )
    .sort((a, b) => a.page - b.page);
  const featured = (chapter.featuredStudies ?? [])
    .map((studyNumber) =>
      prompts.find(
        (prompt) =>
          prompt.issueSlug === issue.slug && prompt.studyNumber === studyNumber,
      ),
    )
    .filter((prompt): prompt is Prompt => Boolean(prompt));
  const firstStudy = studies[0];
  if (featured.length < 3 || !firstStudy) return null;

  const [hero, ...pair] = featured;
  return (
    <article
      className="chapter-opener"
      aria-labelledby={`chapter-opener-${chapter.startPage}`}
    >
      <p className="chapter-opener-kicker">
        Chapter {String(chapterIndex + 1).padStart(2, "0")} ·{" "}
        {pad(chapter.startPage)}
      </p>
      <h1 id={`chapter-opener-${chapter.startPage}`}>{chapter.title}</h1>
      {chapter.intro && <p className="chapter-opener-deck">{chapter.intro}</p>}
      <div className="chapter-opener-meta">
        <span>
          <b>{studies.length}</b> studies
        </span>
        <span>
          Opener <b>{pad(chapter.startPage)}</b>
        </span>
      </div>
      <figure className="chapter-opener-hero">
        <img
          src={assetUrl(hero.referenceImage)}
          alt={`Reference for ${hero.title}`}
          decoding="async"
        />
        <figcaption>
          {pad(hero.studyNumber)} / {hero.source}
        </figcaption>
      </figure>
      <div className="chapter-opener-pair">
        {pair.map((study) => (
          <figure key={study.id}>
            <img
              src={assetUrl(study.referenceImage)}
              alt={`Reference for ${study.title}`}
              decoding="async"
            />
            <figcaption>
              {pad(study.studyNumber)} / {study.source}
            </figcaption>
          </figure>
        ))}
      </div>
      {chapter.openerNote && (
        <p className="chapter-opener-note">{chapter.openerNote}</p>
      )}
      <div className="chapter-opener-actions">
        <Link to={readerPath(issue.slug, firstStudy.page)}>
          Start chapter · page {pad(firstStudy.page)} →
        </Link>
        <button type="button" onClick={() => onInspect(chapter.startPage)}>
          View original {pad(chapter.startPage)}
        </button>
      </div>
    </article>
  );
}
