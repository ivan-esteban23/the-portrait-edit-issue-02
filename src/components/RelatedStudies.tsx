import { Link } from "react-router-dom";
import { assetUrl, prompts, readerPath } from "@/content";
import type { Prompt } from "@/content/schema";
import { getRelatedStudies } from "@/lib/relatedStudies";

export function RelatedStudies({
  prompt,
  context,
}: {
  prompt: Prompt;
  context: "detail" | "reader";
}) {
  const related = getRelatedStudies(prompt, prompts);
  if (!related.length) return null;
  const tags = new Set(prompt.tags.map((tag) => tag.trim().toLowerCase()));
  return (
    <section className="related-studies" aria-label="Related Studies">
      <div className="section-title">
        <h2>Related Studies</h2>
        <p>Shared ideas. Different directions.</p>
      </div>
      <ul className="related-studies-grid">
        {related.map((study) => (
          <li key={study.id}>
            <Link
              to={
                context === "reader"
                  ? readerPath(study.issueSlug, study.page)
                  : `/prompts/${study.id}`
              }
            >
              <img
                src={assetUrl(study.referenceImage)}
                alt=""
                loading="lazy"
                width="360"
                height="440"
              />
              <p className="eyebrow">
                Study {String(study.studyNumber).padStart(3, "0")}
              </p>
              <h3>{study.title}</h3>
              <p className="related-study-tags">
                {study.tags
                  .filter((tag) => tags.has(tag.trim().toLowerCase()))
                  .map((tag) => `#${tag}`)
                  .join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
