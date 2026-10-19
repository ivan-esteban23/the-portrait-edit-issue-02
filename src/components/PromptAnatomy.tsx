import { useState } from "react";
import { copyText, lightHaptic } from "@/lib/utils";
import { parsePromptTokens } from "@/lib/promptParser";

export function PromptAnatomy({ prompt }: { prompt: string }) {
  const [feedback, setFeedback] = useState("");
  const parsed = parsePromptTokens(prompt);
  const copyPhrase = async (phrase: string) => {
    try {
      await copyText(phrase);
      lightHaptic();
      setFeedback("Copied phrase to clipboard");
      window.setTimeout(() => setFeedback(""), 1400);
    } catch {
      setFeedback("Copy unavailable");
    }
  };
  return (
    <div className="prompt-anatomy" aria-label="Prompt anatomy">
      {parsed.categories.map((category) => (
        <section className="anatomy-category" key={category.label}>
          <h4>{category.label}</h4>
          <div className="anatomy-token-list">
            {category.tokens.map((token, index) => (
              <button
                type="button"
                className={`anatomy-token ${category.colorClass}`}
                aria-label={`Copy ${category.label} phrase: ${token}`}
                key={`${category.label}-${index}-${token}`}
                title={`${category.label} · Click to copy phrase`}
                onClick={() => void copyPhrase(token)}
              >
                {token}
              </button>
            ))}
          </div>
        </section>
      ))}
      {Object.keys(parsed.parameters).length > 0 && (
        <section className="anatomy-category">
          <h4>Technical Parameters</h4>
          <div className="anatomy-token-list">
            {Object.entries(parsed.parameters).map(([key, value]) => (
              <button
                type="button"
                className="anatomy-token anatomy-parameter"
                key={key}
                title="Copy parameter"
                onClick={() =>
                  void copyPhrase(`--${key}${value ? ` ${value}` : ""}`)
                }
              >
                --{key}
                {value ? ` ${value}` : ""}
              </button>
            ))}
          </div>
        </section>
      )}
      <p role="status" className="anatomy-feedback">
        {feedback}
      </p>
    </div>
  );
}
