import { responsiveImageProps } from "@/lib/responsiveImages";
import { IconText } from "@/components/ui/IconText";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { assetUrl, currentIssue, prompts, readerPath } from "@/content";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLanguage } from "@/i18n/LanguageProvider";

import { EditorialSelections } from "@/components/EditorialSelections";

export function HomePage() {
  const { t } = useLanguage();
  const lastReadPage = useLastReadPage(currentIssue);
  const navigate = useNavigate();
  const { isSaved, toggleSaved, savedCount } = useBookmarks();
  usePageMeta({
    title: "The Portrait Edit — Issue 02",
    description: currentIssue.description,
    image: assetUrl(currentIssue.cover),
    path: "/",
  });
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
  const hero = prompts.find((p) => p.id === "issue-02-study-004")!;
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            Issue {currentIssue.number} / {t("The Prompt Issue")}
          </p>
          <h1>
            A study in
            <br />
            <em>portraiture.</em>
          </h1>
          <p className="hero-deck">
            Reference images, original prompts, and the creative decisions
            behind a portrait.
          </p>
          <p className="issue-stats">
            {currentIssue.studies} {t("studies")} <span>·</span>{" "}
            {currentIssue.pages} {t("pages")} <span>·</span>{" "}
            {currentIssue.chapters.length} {t("chapters")}
          </p>
          <div className="hero-actions">
            <Button asChild variant="default">
              <Link to={readerPath(currentIssue.slug, lastReadPage)}>
                <IconText>
                  {lastReadPage > 1
                    ? t("Resume reading · Page {page} ↗", {
                        page: lastReadPage,
                      })
                    : t("Start reading ↗")}
                </IconText>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/prompts">{t("Browse studies")}</Link>
            </Button>
          </div>
          <div className="hero-secondary-actions">
            {lastReadPage > 1 && (
              <Button asChild variant="ghost">
                <Link to={readerPath(currentIssue.slug)}>
                  {t("Start from beginning")}
                </Link>
              </Button>
            )}
            <Link to={`/issues/${currentIssue.slug}`}>
              {t("Inside the issue")}
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <Link className="hero-portrait" to={`/prompts/${hero.id}`}>
            <img
              src={assetUrl(hero.referenceImage)}
              {...responsiveImageProps(hero.referenceImage, "hero")}
              alt={hero.title}
              fetchPriority="high"
              decoding="async"
            />
            <span className="hero-image-caption">
              <span>Study {String(hero.studyNumber).padStart(3, "0")}</span>
              <span>
                <IconText>{hero.title} ↗</IconText>
              </span>
            </span>
          </Link>
        </div>
      </section>
      <section
        className="editorial-start"
        aria-labelledby="editorial-start-title"
      >
        <p className="eyebrow">New to the publication?</p>
        <div>
          <h2 id="editorial-start-title">One image. A place to begin.</h2>
          <p>
            Open a study to see its reference, read the original prompt, and try
            one compositional change of your own.
          </p>
        </div>
        <div className="editorial-start-actions">
          <Button asChild>
            <Link to="/prompts/issue-02-study-004">Start with Study 004 ↗</Link>
          </Button>
          <Link to="/prompts/issue-02-study-004?section=connections">
            Follow a visual thread ↗
          </Link>
        </div>
      </section>
      <EditorialSelections />
      <section className="selected-section">
        <div className="section-title">
          <div>
            <p className="eyebrow section-kicker">02 / From the archive</p>
            <h2>{t("Selected studies")}</h2>
          </div>
          <Link to="/prompts">
            <IconText>{t("All studies ↗")}</IconText>
          </Link>
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
      <section className="issue-feature" aria-labelledby="issue-feature-title">
        <Link
          className="hero-cover issue-feature-cover"
          to={readerPath(currentIssue.slug, lastReadPage)}
          aria-labelledby="hero-issue-label"
        >
          <img
            src={assetUrl(currentIssue.cover)}
            width="480"
            height="621"
            alt="The Portrait Edit — Issue 02 cover"
          />
          <span id="hero-issue-label">
            <IconText>Issue 02 — The Prompt Issue ↗</IconText>
          </span>
        </Link>
        <div className="issue-feature-copy">
          <p className="eyebrow">
            03 / The magazine · No. {currentIssue.number}
          </p>
          <h2 id="issue-feature-title">The Prompt Issue</h2>
          <p>
            A working collection of images and the language that shaped them.
            Nine chapters move through light, landscape, fantasy, and fashion.
          </p>
          <Button asChild variant="default">
            <Link to={`/issues/${currentIssue.slug}`}>
              Explore the issue <IconText>↗</IconText>
            </Link>
          </Button>
        </div>
      </section>
      <section className="home-start" aria-labelledby="home-start-title">
        <h2 id="home-start-title">{t("Make the issue yours")}</h2>
        <div className="home-start-grid">
          <Link
            className="home-start-card"
            to={readerPath(currentIssue.slug, lastReadPage)}
          >
            <span className="eyebrow">01 / {t("Read")}</span>
            <h3>
              {lastReadPage > 1
                ? t("Continue on page {page}", { page: lastReadPage })
                : t("Read the magazine")}
            </h3>
            <p>{t("Jump by chapter or pick up on your last page.")}</p>
            <span className="home-start-action">
              <IconText>{t("Open reader")} ↗</IconText>
            </span>
          </Link>
          <Link className="home-start-card" to="/prompts">
            <span className="eyebrow">02 / {t("Explore")}</span>
            <h3>
              {t("Browse {count} studies", { count: currentIssue.studies })}
            </h3>
            <p>
              {t("Filter by style tag, copy prompts, or open Prompt Studio.")}
            </p>
            <span className="home-start-action">
              <IconText>{t("Explore the archive")} ↗</IconText>
            </span>
          </Link>
          <Link className="home-start-card" to="/prompts?saved=1">
            <span className="eyebrow">03 / {t("Collect")}</span>
            <h3>
              {savedCount > 0
                ? t("Your saved studies ({count})", { count: savedCount })
                : t("Build your collection")}
            </h3>
            <p>
              {t(
                "Save studies to your collection to compare, print, or export.",
              )}
            </p>
            <span className="home-start-action">
              <IconText>{t("View saved studies")} ↗</IconText>
            </span>
          </Link>
        </div>
        <p className="home-storage-note">
          {t(
            "Reading progress and collections are saved in this browser. Export your collection from the archive to keep a copy.",
          )}
        </p>
      </section>
    </>
  );
}
