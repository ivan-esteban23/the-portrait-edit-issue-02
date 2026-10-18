import { assetUrl, currentIssue } from "@/content";
import { usePageMeta } from "@/hooks/usePageMeta";

export function AboutPage() {
  usePageMeta({
    title: "About | The Portrait Edit",
    description:
      "About The Portrait Edit — an editorial magazine exploring AI-generated portrait photography",
    image: assetUrl(currentIssue.cover),
    path: "/about",
  });
  return (
    <article className="about editorial-copy">
      <p className="eyebrow">About the publication</p>
      <h1>
        Looking closely.
        <br />
        <em>Writing precisely.</em>
      </h1>
      <section>
        <h2>Editorial statement</h2>
        <p>
          The Portrait Edit is an independent editorial magazine and working
          archive of AI portrait prompts. It brings reference images,
          descriptive language, and working notes together so readers can study
          how light, texture, styling, and composition are articulated.
        </p>
      </section>
      <section>
        <h2>Methodology</h2>
        <p>
          Each study preserves its published prompt, reference, and notes. The
          archive treats those records as a starting point for close reading and
          experimentation. Style tags are drawn from the existing style
          descriptions; unknown model versions, parameters, and dates remain
          unrecorded.
        </p>
        <p>
          Repeated studies and pairing or rights-review flags remain visible. A
          text verification means the prompt matches the published source, not
          that a reference has been cleared for reuse.
        </p>
      </section>
      <section>
        <h2>Contact & source</h2>
        <p>
          For editorial questions or corrections, use the{" "}
          <a href="https://github.com/ivan-esteban23/the-portrait-edit-issue-02/issues">
            publication’s GitHub issue tracker
          </a>
          .
        </p>
        <p>
          <a href="https://github.com/ivan-esteban23/the-portrait-edit">
            Source & production notes ↗
          </a>
        </p>
      </section>
    </article>
  );
}
