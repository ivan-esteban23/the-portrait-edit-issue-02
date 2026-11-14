import { IconText } from "@/components/ui/IconText";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Prompt } from "@/content/schema";
import { responsiveImageProps } from "@/lib/responsiveImages";
import { copyText } from "@/lib/utils";
export function FocusedPrompt({ prompt }: { prompt: Prompt }) {
  const location = useLocation();
  const [reference, setReference] = useState(true),
    [size, setSize] = useState("20"),
    [feedback, setFeedback] = useState("");
  const search = new URLSearchParams(location.search);
  search.delete("reading");
  const returnPath =
    typeof location.state?.readingReturn === "string" &&
    /^\/saved(?:\?|$)/.test(location.state.readingReturn)
      ? location.state.readingReturn
      : `${location.pathname}${search.size ? `?${search}` : ""}`;
  return (
    <section className="focused-prompt">
      <header className="reading-toolbar">
        <Link to={returnPath} state={location.state}>
          <IconText>← Exit reading</IconText>
        </Link>
        <div>
          <label>
            Text size{" "}
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="18">Small</option>
              <option value="20">Medium</option>
              <option value="24">Large</option>
            </select>
          </label>
          <button
            aria-pressed={reference}
            onClick={() => setReference(!reference)}
          >
            {reference ? "Hide reference" : "Show reference"}
          </button>
          <button
            onClick={async () => {
              try {
                await copyText(prompt.prompt);
                setFeedback("Prompt copied.");
              } catch {
                setFeedback(
                  "Copy unavailable. Select the prompt below to copy.",
                );
              }
            }}
          >
            Copy prompt
          </button>
        </div>
      </header>
      <p className="reading-feedback" role="status">
        {feedback}
      </p>
      <div className={`reading-layout${reference ? " has-reference" : ""}`}>
        {reference && (
          <figure>
            <img
              {...responsiveImageProps(prompt.referenceImage, "detail")}
              alt={`Reference for ${prompt.title}`}
            />
            <figcaption>
              Study {String(prompt.studyNumber).padStart(3, "0")} / Page{" "}
              {prompt.page}
            </figcaption>
          </figure>
        )}
        <article>
          <p className="eyebrow">The prompt issue / Focused reading</p>
          <h1>{prompt.title}</h1>
          <p className="reading-style">{prompt.style}</p>
          <h2>Original prompt</h2>
          <p className="reading-prompt-text" style={{ fontSize: `${size}px` }}>
            {prompt.prompt}
          </p>
          <Link to={location.pathname} state={location.state}>
            <IconText>View the complete study ↗</IconText>
          </Link>
        </article>
      </div>
    </section>
  );
}
