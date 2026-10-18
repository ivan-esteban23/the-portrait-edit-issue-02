import { Link, useParams } from "react-router-dom";
import { assetUrl, currentIssue, prompts, readerPath } from "@/content";
import { Study } from "@/components/Study";
import { useEffect } from "react";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta, truncateMetaDescription } from "@/hooks/usePageMeta";

export function StudyPage() {
  const { id } = useParams();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  const prompt = prompts.find((p) => p.id === id);
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
