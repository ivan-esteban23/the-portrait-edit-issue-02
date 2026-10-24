import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { assetUrl, currentIssue, prompts, readerPath } from "@/content";
import { Study } from "@/components/Study";
import { useEffect, useMemo } from "react";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta, truncateMetaDescription } from "@/hooks/usePageMeta";
import { modalOpen } from "@/lib/utils";
import { readArchiveContext } from "@/lib/archiveNavigation";

export function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const archiveContext = useMemo(
    () => readArchiveContext(location.state?.archiveContext),
    [location.state],
  );
  const studyState = useMemo(
    () => (archiveContext ? { archiveContext } : undefined),
    [archiveContext],
  );
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  const prompt = prompts.find((p) => p.id === id);
  const promptIndex = prompts.findIndex((p) => p.id === id);
  const previousPrompt = promptIndex > 0 ? prompts[promptIndex - 1] : undefined;
  const nextPrompt = promptIndex >= 0 ? prompts[promptIndex + 1] : undefined;
  useEffect(() => {
    if (!prompt) return;
    const handleStudyNavigation = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      // An open image inspector or dialog owns the arrow keys.
      if (modalOpen()) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      )
        return;
      if (event.key === "ArrowLeft" && previousPrompt) {
        event.preventDefault();
        navigate(`/prompts/${previousPrompt.id}`, { state: studyState });
      } else if (event.key === "ArrowRight" && nextPrompt) {
        event.preventDefault();
        navigate(`/prompts/${nextPrompt.id}`, { state: studyState });
      }
    };
    window.addEventListener("keydown", handleStudyNavigation);
    return () => window.removeEventListener("keydown", handleStudyNavigation);
  }, [navigate, nextPrompt, previousPrompt, prompt, studyState]);
  usePageMeta({
    title: prompt
      ? `Study #${prompt.studyNumber}: ${prompt.title} | The Portrait Edit`
      : "Page not found | The Portrait Edit",
    description: prompt ? truncateMetaDescription(prompt.prompt) : undefined,
    image: assetUrl(prompt?.referenceImage ?? currentIssue.cover),
    path: prompt ? `/prompts/${prompt.id}` : undefined,
  });
  if (!prompt) return <NotFoundPage />;
  return (
    <section className="standalone-study">
      <div className="study-links">
        <Link
          to={{ pathname: "/prompts", search: archiveContext?.search ?? "" }}
          state={archiveContext ? { archiveReturn: archiveContext } : undefined}
        >
          ← Prompt archive
        </Link>
        <Link to={readerPath(prompt.issueSlug, prompt.page)}>
          Read in the issue ↗
        </Link>
      </div>
      <nav className="study-sequence-nav" aria-label="Study navigation">
        {previousPrompt ? (
          <Link
            to={`/prompts/${previousPrompt.id}`}
            state={studyState}
            rel="prev"
          >
            <span>← Previous study</span>
            <strong>
              #{String(previousPrompt.studyNumber).padStart(3, "0")} ·{" "}
              {previousPrompt.title}
            </strong>
            <kbd>←</kbd>
          </Link>
        ) : (
          <span />
        )}
        {nextPrompt ? (
          <Link to={`/prompts/${nextPrompt.id}`} state={studyState} rel="next">
            <span>Next study →</span>
            <strong>
              #{String(nextPrompt.studyNumber).padStart(3, "0")} ·{" "}
              {nextPrompt.title}
            </strong>
            <kbd>→</kbd>
          </Link>
        ) : (
          <span />
        )}
      </nav>
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
