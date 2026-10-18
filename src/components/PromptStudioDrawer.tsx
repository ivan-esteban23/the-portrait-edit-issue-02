import { useState, useRef, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Prompt } from "@/content/schema";
import { copyText } from "@/lib/utils";
import { formatCommand, splitPromptParameters } from "@/lib/promptFormatter";
import { CommandParameters } from "./CommandParameters";
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

export interface QuickStylePreset {
  id: string;
  label: string;
  aspectRatio: string;
  stylize: number;
  modelPreset: string;
}

export const QUICK_STYLE_PRESETS: QuickStylePreset[] = [
  {
    id: "high-fashion",
    label: "High Fashion 4:5",
    aspectRatio: "4:5",
    stylize: 750,
    modelPreset: "--v 6.1 --style raw",
  },
  {
    id: "cinematic",
    label: "Cinematic 16:9",
    aspectRatio: "16:9",
    stylize: 250,
    modelPreset: "--v 6.1",
  },
  {
    id: "square-studio",
    label: "Square Studio 1:1",
    aspectRatio: "1:1",
    stylize: 100,
    modelPreset: "--v 6.1",
  },
];

export interface RemixRecord {
  id: string;
  promptId: string;
  title: string;
  prompt: string;
  parameters: {
    ar?: string;
    aspectRatio?: string;
    stylize?: number;
    chaos?: number;
    modelPreset?: string;
    keywords?: string[];
  };
  timestamp: number;
}

const REMIX_STORAGE_KEY = "the-portrait-edit:remixes";

function loadRemixes(): RemixRecord[] {
  try {
    const raw = localStorage.getItem(REMIX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRemixes(remixes: RemixRecord[]) {
  try {
    localStorage.setItem(REMIX_STORAGE_KEY, JSON.stringify(remixes.slice(0, 20)));
  } catch {
    /* localStorage full or denied */
  }
}

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
  const returnFocus = useRef<HTMLElement | null>(null);
  const alive = useRef(true);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  // Extract initial parameters from study
  const initialAr = (prompt.parameters?.["ar"] ||
    prompt.parameters?.["--ar"] ||
    "4:5") as string;
  const initialS = Number(
    prompt.parameters?.["s"] || prompt.parameters?.["--s"] || 250,
  );
  const initialC = Number(
    prompt.parameters?.["c"] || prompt.parameters?.["--c"] || 0,
  );

  const [aspectRatio, setAspectRatio] = useState<string>(initialAr);
  const [modelPreset, setModelPreset] = useState<string>("--v 6.1");
  const [stylize, setStylize] = useState<number>(
    initialS >= 50 && initialS <= 750 ? initialS : 250,
  );
  const [chaos, setChaos] = useState<number>(
    initialC >= 0 && initialC <= 30 ? initialC : 0,
  );
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [copied, setCopied] = useState<string>("");
  const [enabledParameters, setEnabledParameters] = useState([
    "v",
    "style",
    "ar",
    "s",
    "c",
  ]);

  useEffect(() => {
    setCopied("");
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, [
    aspectRatio,
    modelPreset,
    stylize,
    chaos,
    selectedKeywords,
    enabledParameters,
  ]);

  // Sync state when prompt changes
  useEffect(() => {
    setAspectRatio(initialAr);
    setStylize(initialS >= 50 && initialS <= 750 ? initialS : 250);
    setChaos(initialC >= 0 && initialC <= 30 ? initialC : 0);
    setSelectedKeywords([]);
    setCopied("");
    setEnabledParameters(["v", "style", "ar", "s", "c"]);
  }, [prompt.id, initialAr, initialS, initialC]);

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
    setCopied("");
    setEnabledParameters(["v", "style", "ar", "s", "c"]);
  };

  // Strip existing parameter flags from base prompt text for clean appending
  const cleanBasePrompt = splitPromptParameters(prompt.prompt).text;

  // Construct modified prompt string
  const keywordsString =
    selectedKeywords.length > 0 ? `, ${selectedKeywords.join(", ")}` : "";

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

  const parameters = Array.from(
    splitPromptParameters(parametersString).parameters,
    ([key, value]) => ({ key, value }),
  );
  const commandText = formatCommand(
    `${cleanBasePrompt}${keywordsString}`,
    parameters,
    enabledParameters,
  );
  const modifiedPrompt =
    modelPreset === "[FLUX.1 Dev]"
      ? `[FLUX.1 Dev] ${cleanBasePrompt}${keywordsString}`
      : commandText;

  const [remixes, setRemixes] = useState<RemixRecord[]>(loadRemixes);

  useEffect(() => {
    if (isOpen) {
      setRemixes(loadRemixes());
    }
  }, [isOpen]);

  const addRemixToHistory = (textToSave: string) => {
    const record: RemixRecord = {
      id: `${prompt.id}-${Date.now()}`,
      promptId: prompt.id,
      title: prompt.title,
      prompt: textToSave,
      parameters: {
        ar: aspectRatio,
        aspectRatio,
        stylize,
        chaos,
        modelPreset,
        keywords: selectedKeywords,
      },
      timestamp: Date.now(),
    };
    setRemixes((prev) => {
      const next = [
        record,
        ...prev.filter((r) => r.prompt !== textToSave),
      ].slice(0, 20);
      saveRemixes(next);
      return next;
    });
  };

  const applyRemix = (remix: RemixRecord) => {
    if (remix.parameters.aspectRatio)
      setAspectRatio(remix.parameters.aspectRatio);
    if (remix.parameters.stylize !== undefined)
      setStylize(remix.parameters.stylize);
    if (remix.parameters.chaos !== undefined) setChaos(remix.parameters.chaos);
    if (remix.parameters.modelPreset)
      setModelPreset(remix.parameters.modelPreset);
    if (remix.parameters.keywords) setSelectedKeywords(remix.parameters.keywords);
  };

  const clearRemixes = () => {
    try {
      localStorage.removeItem(REMIX_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setRemixes([]);
  };

  const handleCopy = async (format: "plain" | "discord" = "plain") => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    const textToCopy =
      format === "discord"
        ? `/imagine prompt: ${commandText}`
        : modifiedPrompt;
    try {
      await copyText(textToCopy);
      if (!alive.current) return;
      addRemixToHistory(textToCopy);
      setCopied(
        format === "discord"
          ? "Discord /imagine command copied."
          : "Modified prompt copied.",
      );
      feedbackTimer.current = setTimeout(() => setCopied(""), 2000);
    } catch {
      if (alive.current)
        setCopied("Copy unavailable. Select the preview text to copy it.");
    }
  };

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="prompt-studio-overlay">
          <DialogPrimitive.Content
            asChild
            aria-describedby={undefined}
            onOpenAutoFocus={() => {
              returnFocus.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <aside className="prompt-studio-drawer">
              <header className="prompt-studio-header">
                <div>
                  <span className="prompt-studio-eyebrow">
                    Study #{String(prompt.studyNumber).padStart(3, "0")} ·
                    Parameter Studio
                  </span>
                  <DialogPrimitive.Title asChild>
                    <h2>Prompt Studio</h2>
                  </DialogPrimitive.Title>
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
                {/* Section: Quick Style Presets */}
                <div className="studio-group studio-presets-group">
                  <span className="studio-group-label">
                    Quick Style Presets <span>(Fast Apply)</span>
                  </span>
                  <div
                    className="studio-presets-row"
                    role="group"
                    aria-label="Quick style presets"
                  >
                    {QUICK_STYLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="studio-preset-chip"
                        onClick={() => {
                          setAspectRatio(preset.aspectRatio);
                          setStylize(preset.stylize);
                          setModelPreset(preset.modelPreset);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Aspect Ratio Presets */}
                <div className="studio-group">
                  <label className="studio-group-label">
                    Aspect Ratio <span>(--ar)</span>
                  </label>
                  <div
                    className="studio-pill-group"
                    role="radiogroup"
                    aria-label="Aspect ratio"
                  >
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
                  <div
                    className="studio-pill-group"
                    role="radiogroup"
                    aria-label="Model preset"
                  >
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
                    <label
                      htmlFor="stylize-slider"
                      className="studio-group-label"
                    >
                      Stylize <span>(--s)</span>
                    </label>
                    <output
                      htmlFor="stylize-slider"
                      className="studio-val-badge"
                    >
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
                    <label
                      htmlFor="chaos-slider"
                      className="studio-group-label"
                    >
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

                <CommandParameters
                  parameters={parameters}
                  enabled={enabledParameters}
                  onChange={(keys) => {
                    setEnabledParameters(keys);
                    setCopied("");
                  }}
                />
                <p
                  role="status"
                  aria-label="Copy feedback"
                  className="studio-copy-feedback"
                >
                  {copied}
                </p>
                {/* Live Updated Preview Box */}
                <div className="studio-group preview-box-group">
                  <div className="preview-box-header">
                    <span className="studio-group-label">
                      Live Prompt Preview
                    </span>
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

                {/* Section: Recent Remixes (Collapsible) */}
                <details className="studio-remixes-details" open={false}>
                  <summary className="studio-remixes-summary">
                    <span>Recent Remixes ({remixes.length})</span>
                    {remixes.length > 0 && (
                      <button
                        type="button"
                        className="clear-remixes-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearRemixes();
                        }}
                        aria-label="Clear history"
                      >
                        Clear history
                      </button>
                    )}
                  </summary>
                  <div className="studio-remixes-list">
                    {remixes.length === 0 ? (
                      <p className="no-remixes-note">
                        No saved remixes yet. Copy a tweaked prompt to save it here.
                      </p>
                    ) : (
                      remixes.map((remix) => (
                        <div key={remix.id} className="remix-card">
                          <div className="remix-header">
                            <span className="remix-title">{remix.title}</span>
                            <span className="remix-date">
                              {new Date(remix.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="remix-prompt-snippet">{remix.prompt}</p>
                          <div className="remix-actions">
                            <Button
                              type="button"
                              variant="outline"
                              className="remix-apply-btn"
                              onClick={() => applyRemix(remix)}
                            >
                              Re-apply settings
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>

              <footer className="prompt-studio-footer">
                <Button
                  type="button"
                  variant="default"
                  className="studio-copy-action-btn"
                  onClick={() => handleCopy()}
                >
                  {copied === "Modified prompt copied."
                    ? "✓ Copied to Clipboard!"
                    : "Copy Modified Prompt"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy("discord")}
                >
                  Copy Discord /imagine
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Done
                </Button>
              </footer>
            </aside>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
