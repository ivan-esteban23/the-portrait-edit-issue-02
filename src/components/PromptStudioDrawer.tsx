import { useState, useId, useEffect } from "react";
import type { Prompt } from "@/content/schema";
import { copyText } from "@/lib/utils";
import { Button } from "./ui/button";

interface PromptStudioDrawerProps {
  prompt: Prompt;
  isOpen: boolean;
  onClose: () => void;
}

const ASPECT_RATIO_PRESETS = [
  { label: "4:5 Portrait", value: "4:5" },
  { label: "16:9 Cinema", value: "16:9" },
  { label: "1:1 Square", value: "1:1" },
  { label: "2:3 Classic", value: "2:3" },
  { label: "9:16 Story", value: "9:16" },
];

const MODEL_PRESETS = [
  { label: "Midjourney v6.1", value: "--v 6.1", type: "mj" },
  { label: "Midjourney Raw", value: "--v 6.1 --style raw", type: "mj-raw" },
  { label: "FLUX.1 Dev", value: "[FLUX.1 Dev]", type: "flux" },
  { label: "Default", value: "", type: "default" },
];

const STYLIZE_PRESETS = [50, 100, 250, 500, 750];

const LIGHTING_FILM_KEYWORDS = [
  "35mm photograph",
  "dramatic chiaroscuro",
  "hasselblad 80mm",
  "cinematic rim lighting",
  "kodak portra 400",
  "golden hour soft diffusion",
  "rembrandt studio lighting",
  "subtle film grain",
  "deep tonal contrast",
  "anamorphic bokeh",
];

export function PromptStudioDrawer({
  prompt,
  isOpen,
  onClose,
}: PromptStudioDrawerProps) {
  const titleId = useId();

  // Extract initial parameters from study
  const initialAr = (prompt.parameters?.["ar"] || prompt.parameters?.["--ar"] || "4:5") as string;
  const initialS = Number(prompt.parameters?.["s"] || prompt.parameters?.["--s"] || 250);
  const initialC = Number(prompt.parameters?.["c"] || prompt.parameters?.["--c"] || 0);

  const [aspectRatio, setAspectRatio] = useState<string>(initialAr);
  const [modelPreset, setModelPreset] = useState<string>("--v 6.1");
  const [stylize, setStylize] = useState<number>(initialS >= 50 && initialS <= 750 ? initialS : 250);
  const [chaos, setChaos] = useState<number>(initialC >= 0 && initialC <= 30 ? initialC : 0);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state when prompt changes
  useEffect(() => {
    setAspectRatio(initialAr);
    setStylize(initialS >= 50 && initialS <= 750 ? initialS : 250);
    setChaos(initialC >= 0 && initialC <= 30 ? initialC : 0);
    setSelectedKeywords([]);
    setCopied(false);
  }, [prompt.id, initialAr, initialS, initialC]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw],
    );
  };

  const handleReset = () => {
    setAspectRatio(initialAr);
    setModelPreset("--v 6.1");
    setStylize(250);
    setChaos(0);
    setSelectedKeywords([]);
    setCopied(false);
  };

  // Strip existing parameter flags from base prompt text for clean appending
  const cleanBasePrompt = prompt.prompt
    .replace(/\s+--(ar|v|s|c|style|chaos|stylize)\s+[^\s]+/gi, "")
    .trim();

  // Construct modified prompt string
  const keywordsString = selectedKeywords.length > 0 ? `, ${selectedKeywords.join(", ")}` : "";

  let parametersString = "";
  if (modelPreset.startsWith("--")) {
    parametersString += ` ${modelPreset}`;
  }
  if (aspectRatio) {
    parametersString += ` --ar ${aspectRatio}`;
  }
  if (stylize !== undefined) {
    parametersString += ` --s ${stylize}`;
  }
  if (chaos > 0) {
    parametersString += ` --c ${chaos}`;
  }

  const modifiedPrompt = modelPreset === "[FLUX.1 Dev]"
    ? `[FLUX.1 Dev] ${cleanBasePrompt}${keywordsString} --ar ${aspectRatio}`
    : `${cleanBasePrompt}${keywordsString}${parametersString}`;

  const handleCopy = async () => {
    try {
      await copyText(modifiedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="prompt-studio-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <aside
        className="prompt-studio-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Prompt Studio Parameter Tweaker"
      >
        <header className="prompt-studio-header">
          <div>
            <span className="prompt-studio-eyebrow">
              Study #{String(prompt.studyNumber).padStart(3, "0")} · Parameter Studio
            </span>
            <h2 id={titleId}>Prompt Studio</h2>
          </div>
          <Button
            variant="ghost"
            className="prompt-studio-close-btn"
            onClick={onClose}
            aria-label="Close Prompt Studio"
          >
            ✕
          </Button>
        </header>

        <div className="prompt-studio-body">
          {/* Section: Aspect Ratio Presets */}
          <div className="studio-group">
            <label className="studio-group-label">
              Aspect Ratio <span>(--ar)</span>
            </label>
            <div className="studio-pill-group" role="radiogroup" aria-label="Aspect ratio">
              {ASPECT_RATIO_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={aspectRatio === p.value}
                  className={`studio-pill-btn ${aspectRatio === p.value ? "is-active" : ""}`}
                  onClick={() => setAspectRatio(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Model Presets */}
          <div className="studio-group">
            <label className="studio-group-label">
              Model & Engine <span>(Diffusion Target)</span>
            </label>
            <div className="studio-pill-group" role="radiogroup" aria-label="Model preset">
              {MODEL_PRESETS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  role="radio"
                  aria-checked={modelPreset === m.value}
                  className={`studio-pill-btn ${modelPreset === m.value ? "is-active" : ""}`}
                  onClick={() => setModelPreset(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Stylize Slider */}
          <div className="studio-group">
            <div className="studio-slider-header">
              <label htmlFor="stylize-slider" className="studio-group-label">
                Stylize <span>(--s)</span>
              </label>
              <output htmlFor="stylize-slider" className="studio-val-badge">
                --s {stylize}
              </output>
            </div>
            <input
              id="stylize-slider"
              type="range"
              min={50}
              max={750}
              step={25}
              value={stylize}
              onChange={(e) => setStylize(Number(e.target.value))}
              className="studio-range-slider"
            />
            <div className="studio-quick-presets">
              {STYLIZE_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`studio-micro-btn ${stylize === val ? "is-active" : ""}`}
                  onClick={() => setStylize(val)}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Chaos Slider */}
          <div className="studio-group">
            <div className="studio-slider-header">
              <label htmlFor="chaos-slider" className="studio-group-label">
                Chaos / Variation <span>(--c)</span>
              </label>
              <output htmlFor="chaos-slider" className="studio-val-badge">
                --c {chaos}
              </output>
            </div>
            <input
              id="chaos-slider"
              type="range"
              min={0}
              max={30}
              step={1}
              value={chaos}
              onChange={(e) => setChaos(Number(e.target.value))}
              className="studio-range-slider"
            />
            <div className="studio-quick-presets">
              {[0, 5, 10, 20, 30].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`studio-micro-btn ${chaos === val ? "is-active" : ""}`}
                  onClick={() => setChaos(val)}
                >
                  {val === 0 ? "0 (Stable)" : val}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Lighting & Film Modifiers */}
          <div className="studio-group">
            <label className="studio-group-label">
              Lighting & Film Modifiers <span>(Click to toggle)</span>
            </label>
            <div className="studio-keywords-grid">
              {LIGHTING_FILM_KEYWORDS.map((kw) => {
                const active = selectedKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    aria-pressed={active}
                    className={`keyword-chip ${active ? "is-active" : ""}`}
                    onClick={() => toggleKeyword(kw)}
                  >
                    <span>{active ? "✓ " : "+ "}</span>
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Updated Preview Box */}
          <div className="studio-group preview-box-group">
            <div className="preview-box-header">
              <span className="studio-group-label">Live Prompt Preview</span>
              <button
                type="button"
                className="studio-reset-link"
                onClick={handleReset}
                title="Reset all tweaks to study defaults"
              >
                Reset to default
              </button>
            </div>
            <div
              id="prompt-preview"
              className="studio-prompt-preview"
              tabIndex={0}
              role="region"
              aria-label="Live Prompt Preview"
            >
              <p className="preview-text">{modifiedPrompt}</p>
            </div>
          </div>
        </div>

        <footer className="prompt-studio-footer">
          <Button
            type="button"
            variant="default"
            className="studio-copy-action-btn"
            onClick={handleCopy}
          >
            {copied ? "✓ Copied to Clipboard!" : "Copy Modified Prompt"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Done
          </Button>
        </footer>
      </aside>
    </div>
  );
}
