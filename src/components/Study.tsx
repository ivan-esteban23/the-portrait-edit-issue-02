import { useEffect, useRef, useState } from "react";
import type { Prompt } from "@/content/schema";
import { assetUrl } from "@/content";
import { copyText } from "@/lib/utils";
import { Button } from "./ui/button";
export function PromptCard({ prompt }: { prompt: Prompt }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setFeedback("");
    try {
      await copyText(prompt.prompt);
      if (!alive.current) return;
      setFeedback("Prompt copied.");
      timer.current = setTimeout(() => setFeedback(""), 1600);
    } catch {
      if (alive.current)
        setFeedback("Copy unavailable. Select the prompt text to copy it.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="prompt-card" aria-label="Image prompt">
      <div className="prompt-card-heading">
        <h3>Image Prompt</h3>
        <Button variant="ghost" onClick={copy} disabled={busy}>
          {feedback === "Prompt copied."
            ? "Copied"
            : busy
              ? "Copying…"
              : "Copy prompt"}
        </Button>
      </div>
      <p className="prompt-body">{prompt.prompt}</p>
      <p role="status" className="copy-feedback">
        {feedback}
      </p>
      <p className="source-note">Text checked against the published study.</p>
    </section>
  );
}
export function Study({ prompt }: { prompt: Prompt }) {
  return (
    <article className="study-article">
      <header>
        <p className="eyebrow">
          Study {String(prompt.studyNumber).padStart(3, "0")}{" "}
          <span> / Page {prompt.page}</span>
        </p>
        <h1>{prompt.title}</h1>
        <p className="study-style">{prompt.style}</p>
      </header>
      <figure>
        <img
          src={assetUrl(prompt.referenceImage)}
          alt={`Reference for ${prompt.title}`}
          decoding="async"
        />
        <figcaption>
          Source: {prompt.source}
          <span>{prompt.flags}</span>
        </figcaption>
      </figure>
      <PromptCard key={prompt.id} prompt={prompt} />
      <section className="article-section">
        <h3>Working notes</h3>
        <p className="preserve-text">{prompt.workingNotes}</p>
      </section>
      <section className="article-section">
        <h3>Try this</h3>
        <p className="preserve-text">{prompt.tryThis}</p>
      </section>
    </article>
  );
}
