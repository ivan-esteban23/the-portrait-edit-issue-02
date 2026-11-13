import { Link, useLocation } from "react-router-dom";
import { assetUrl, currentIssue, issues, prompts } from "@/content";
import type { Prompt } from "@/content/schema";
import { responsiveImageProps } from "@/lib/responsiveImages";
import { getStudyConnections } from "@/lib/studyConnections";
import { readArchiveContext } from "@/lib/archiveNavigation";

export function StudyConnections({ prompt }: { prompt: Prompt }) {
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from");
  const excluded = prompts.find((p) => p.id === from)?.id;
  const archiveContext = readArchiveContext(location.state?.archiveContext);
  const issue = issues.find((i) => i.slug === prompt.issueSlug) ?? currentIssue;
  const connections = getStudyConnections(prompt, prompts, issue, excluded);
  if (!connections.length) return null;
  return (
    <section
      className="related-studies study-connections"
      id={`connections-${prompt.id}`}
      tabIndex={-1}
      aria-label="Related Studies"
    >
      <div className="connection-intro">
        <div>
          <p className="eyebrow">Keep looking / Suggested connections</p>
          <h2>Where this portrait leads.</h2>
        </div>
        <p>
          Follow one idea into another image. Keep something familiar. Notice
          what changes.
        </p>
      </div>
      <div className="connection-grid">
        {connections.map((connection, index) => (
          <article className="connection-card" key={connection.target.id}>
            <div className="connection-image">
              <img
                src={assetUrl(connection.target.referenceImage)}
                {...responsiveImageProps(
                  connection.target.referenceImage,
                  "connection",
                )}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} / {connection.dimension}
            </p>
            <h3>{connection.title}</h3>
            <p className="connection-reason">{connection.reason}</p>
            <p className="connection-basis">{connection.basis}</p>
            <details className="connection-comparison">
              <summary>Compare prompt language</summary>
              <div>
                <p className="eyebrow">
                  Starting point · Study{" "}
                  {String(prompt.studyNumber).padStart(3, "0")}
                </p>
                <blockquote>“{connection.source}”</blockquote>
                <p className="eyebrow">
                  Next · Study{" "}
                  {String(connection.target.studyNumber).padStart(3, "0")}
                </p>
                <blockquote>“{connection.destination}”</blockquote>
                <p className="comparison-note">
                  Excerpts from the published prompts.
                </p>
              </div>
            </details>
            <Link
              className="connection-action"
              to={`/prompts/${connection.target.id}?from=${encodeURIComponent(prompt.id)}`}
              state={archiveContext ? { archiveContext } : undefined}
            >
              <span>
                <span className="eyebrow">
                  Read Study{" "}
                  {String(connection.target.studyNumber).padStart(3, "0")}
                </span>
                <span>{connection.target.title}</span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
      <p className="connections-note">
        Connections are suggested readings of the published tags, chapter order,
        and prompt language. Original prompts are unchanged.
      </p>
    </section>
  );
}
