import { Link, Navigate, useNavigate } from "react-router-dom";
import { assetUrl, currentIssue, prompts, readerPath } from "@/content";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { useLastReadPage } from "@/hooks/useReadingProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLanguage } from "@/i18n/LanguageProvider";

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
  return (
    <>
      <section className="home-hero">
        <div>
          <p className="eyebrow">
            Issue {currentIssue.number} / {t("A portrait archive")}
          </p>
          <h1>
            The
            <br />
            <em>Prompt</em> Issue
          </h1>
          <p className="hero-deck">{currentIssue.description}</p>
          <p className="issue-stats">
            {currentIssue.studies} {t("studies")} <span>·</span>{" "}
            {currentIssue.pages} {t("pages")} <span>·</span>{" "}
            {currentIssue.chapters.length} {t("chapters")}
          </p>
          <div className="hero-actions">
            <Button asChild variant="default">
              <Link to={readerPath(currentIssue.slug, lastReadPage)}>
                {lastReadPage > 1
                  ? t("Resume reading · Page {page} ↗", { page: lastReadPage })
                  : t("Start reading ↗")}
              </Link>
            </Button>
            {lastReadPage > 1 && (
              <Button asChild variant="outline">
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
        <Link
          className="hero-cover"
          to={readerPath(currentIssue.slug, lastReadPage)}
          aria-label={t("Read The Prompt Issue")}
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
            <p>
              {t(
                "Turn the pages, explore the chapters, and return where you left off.",
              )}
            </p>
            <span className="home-start-action">{t("Open reader")} ↗</span>
          </Link>
          <Link className="home-start-card" to="/prompts">
            <span className="eyebrow">02 / {t("Explore")}</span>
            <h3>
              {t("Browse {count} studies", { count: currentIssue.studies })}
            </h3>
            <p>
              {t(
                "Find a visual direction, copy a prompt, or adjust it in Prompt Studio.",
              )}
            </p>
            <span className="home-start-action">
              {t("Explore the archive")} ↗
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
                "Save studies as you explore. Return to your collection and export it for later.",
              )}
            </p>
            <span className="home-start-action">
              {t("View saved studies")} ↗
            </span>
          </Link>
        </div>
        <p className="home-storage-note">
          {t(
            "Reading progress and collections are saved in this browser. Export your collection from the archive to keep a copy.",
          )}
        </p>
      </section>
      <section className="selected-section">
        <div className="section-title">
          <h2>{t("From the archive")}</h2>
          <Link to="/prompts">{t("All studies ↗")}</Link>
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
