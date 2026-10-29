import { IconText } from "@/components/ui/IconText";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { assetUrl, currentIssue, prompts } from "@/content";
import { Button } from "@/components/ui/button";
import { ArchiveTagPicker } from "@/components/ArchiveTagPicker";
import { StudyCard } from "@/components/StudyCard";
import { useBookmarks } from "@/hooks/useBookmarks";
import { splitPromptParameters } from "@/lib/promptFormatter";
import { copyText } from "@/lib/utils";
import { generateMarkdownDossier, downloadFile } from "@/lib/dossier";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMedia } from "@/hooks/useReader";
import { useLanguage } from "@/i18n/LanguageProvider";
import { matchesArchiveSearch } from "@/lib/archiveSearch";
import { readArchiveContext } from "@/lib/archiveNavigation";

type ParsedParameters = ReturnType<typeof splitPromptParameters>;

const CompareLab = lazy(() =>
  import("@/components/CompareLab").then((m) => ({ default: m.CompareLab })),
);
const ImageLightbox = lazy(() =>
  import("@/components/ImageLightbox").then((m) => ({
    default: m.ImageLightbox,
  })),
);

// Filter value for studies without a recorded --ar parameter.
const NOT_RECORDED = "none";

export function ArchivePage() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const returnContext = useMemo(
    () => readArchiveContext(location.state?.archiveReturn),
    [location.state],
  );
  usePageMeta({
    title: `Prompt Archive (${prompts.length} Studies) | The Portrait Edit`,
    description:
      "Browse and filter all 165 portrait studies in The Portrait Edit Issue 02",
    image: assetUrl(currentIssue.cover),
    path: "/prompts",
    preserveScroll: Boolean(returnContext),
  });
  const archive = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const moreTagsButton = useRef<HTMLButtonElement>(null);
  const [tagsExpanded, setTagsExpanded] = useState(
    () => returnContext?.tagsExpanded ?? false,
  );
  useLayoutEffect(() => {
    if (!returnContext) return;
    const frame = requestAnimationFrame(() => {
      const card = Array.from(
        archive.current?.querySelectorAll<HTMLAnchorElement>(
          "a[data-study-id]",
        ) ?? [],
      ).find((link) => link.dataset.studyId === returnContext.studyId);
      (card ?? searchInput.current)?.focus({ preventScroll: true });
      window.scrollTo({ top: returnContext.scrollY, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [returnContext]);
  const widePhone = useMedia("(min-width: 390px)");
  const tablet = useMedia("(min-width: 768px)");
  const desktop = useMedia("(min-width: 1024px)");
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [printProgress, setPrintProgress] = useState<{
    loaded: number;
    total: number;
    opening: boolean;
  } | null>(null);
  const printAttempt = useRef(0);
  async function printSelection() {
    const attempt = ++printAttempt.current;
    const isCurrentAttempt = () => printAttempt.current === attempt;
    setPreparingPrint(true);
    try {
      const images = Array.from(
        archive.current?.querySelectorAll<HTMLImageElement>(
          ".archive-grid img",
        ) || [],
      );
      images.forEach((image) => {
        image.loading = "eager";
      });
      setPrintProgress({ loaded: 0, total: images.length, opening: false });
      await Promise.allSettled(
        images.map((image) => {
          const updateProgress = () => {
            if (isCurrentAttempt()) {
              setPrintProgress((progress) =>
                progress
                  ? { ...progress, loaded: progress.loaded + 1 }
                  : progress,
              );
            }
          };
          try {
            const decoding = image.decode?.();
            if (!decoding) {
              updateProgress();
              return undefined;
            }
            return decoding.then(updateProgress, updateProgress);
          } catch {
            /* Continue printing even if an image cannot be decoded. */
            updateProgress();
            return undefined;
          }
        }),
      );
      if (!isCurrentAttempt()) return;
      await document.fonts?.ready;
      if (!isCurrentAttempt()) return;
      setPrintProgress((progress) =>
        progress ? { ...progress, opening: true } : progress,
      );
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      if (!isCurrentAttempt()) return;
      window.print();
    } finally {
      if (isCurrentAttempt()) {
        setPreparingPrint(false);
        setPrintProgress(null);
      }
    }
  }

  function cancelPrint() {
    printAttempt.current += 1;
    setPreparingPrint(false);
    setPrintProgress(null);
  }
  const [search, setSearch] = useSearchParams();
  const {
    isSaved,
    toggleSaved,
    exportSaved,
    exportMarkdown,
    savedCount,
    activeCollection,
    setActiveCollection,
    createCollection,
    collections,
  } = useBookmarks();

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [newColName, setNewColName] = useState("");
  const [showNewCol, setShowNewCol] = useState(false);

  // Multi-select batch actions state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchCopied, setBatchCopied] = useState<"" | "copied" | "failed">("");
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchRequest = useRef(0);

  useEffect(() => {
    return () => {
      batchRequest.current += 1;
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);
  useEffect(() => {
    batchRequest.current += 1;
    setBatchCopied("");
    if (batchTimer.current) clearTimeout(batchTimer.current);
  }, [selectedIds]);

  const query = search.get("q") ?? "",
    tag = search.get("tag") ?? "",
    model = search.get("model") ?? "",
    aspectRatio = search.get("ar") ?? "",
    savedOnly = search.get("saved") === "1";

  const hasActiveFilters = Boolean(
    query || tag || model || aspectRatio || savedOnly,
  );

  const secondaryFilterCount = [tag, model, aspectRatio].filter(Boolean).length;

  const tags = useMemo(
    () => [...new Set(prompts.flatMap((p) => p.tags))].sort(),
    [],
  );

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      p.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, []);

  const popularTagCount = desktop ? 6 : tablet ? 3 : widePhone ? 2 : 1;
  const popularTags = tagCounts.slice(0, popularTagCount);
  const additionalTags = tagCounts.slice(popularTagCount);
  const selectedAdditionalTag = additionalTags.find(({ name }) => name === tag);
  const hiddenTagCount =
    additionalTags.length - (selectedAdditionalTag ? 1 : 0);

  function tagButton({ name, count }: { name: string; count: number }) {
    const isActive = tag === name;
    return (
      <button
        key={name}
        type="button"
        className={`tag-pill ${isActive ? "is-active" : ""}`}
        aria-pressed={isActive}
        onFocus={(event) =>
          event.currentTarget.scrollIntoView?.({
            block: "nearest",
            inline: "nearest",
            behavior: "instant",
          })
        }
        onClick={() => {
          filter("tag", isActive ? "" : name);
          // A pinned tag disappears when cleared; keep focus on a visible control.
          if (
            isActive &&
            (!tagsExpanded || !tablet) &&
            selectedAdditionalTag?.name === name
          ) {
            moreTagsButton.current?.focus();
          }
        }}
      >
        #{name} <span className="tag-pill-count">({count})</span>
      </button>
    );
  }

  const parsedParameters = useMemo(
    () =>
      new Map<string, ParsedParameters>(
        prompts.map((p) => [p.id, splitPromptParameters(p.prompt)]),
      ),
    [],
  );

  // Only ratios actually recorded in a study are offered. Studies without a
  // recorded --ar are "Not recorded"; they are never assumed to be 4:5.
  const aspectRatios = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      const rawAr =
        p.parameters?.["ar"] ||
        p.parameters?.["--ar"] ||
        parsedParameters.get(p.id)?.parameters.get("ar");
      if (rawAr && rawAr !== "Unspecified") {
        set.add(String(rawAr).trim());
      }
    });
    return Array.from(set).sort();
  }, [parsedParameters]);

  const models = useMemo(
    () =>
      [...new Set(prompts.map((p) => p.model?.trim()))]
        .filter((value): value is string =>
          Boolean(value && value !== "Unspecified"),
        )
        .sort(),
    [],
  );
  const hasUnspecifiedModels = prompts.some(
    (p) => !p.model?.trim() || p.model.trim() === "Unspecified",
  );
  const hasUnrecordedRatios = prompts.some((p) => {
    const ratio =
      p.parameters?.["ar"] ||
      p.parameters?.["--ar"] ||
      parsedParameters.get(p.id)?.parameters.get("ar");
    return !ratio || String(ratio).trim() === "Unspecified";
  });

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (savedOnly && !isSaved(p.id)) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (model) {
        const normalizedModel = p.model?.trim();
        const recordedModel =
          normalizedModel && normalizedModel !== "Unspecified"
            ? normalizedModel
            : "Unspecified";
        if (recordedModel !== model) return false;
      }
      if (aspectRatio) {
        const pAr =
          p.parameters?.["ar"] ||
          p.parameters?.["--ar"] ||
          parsedParameters.get(p.id)?.parameters.get("ar");
        const recorded =
          pAr && String(pAr).trim() !== "Unspecified"
            ? String(pAr).trim()
            : NOT_RECORDED;
        if (recorded !== aspectRatio) return false;
      }
      if (!matchesArchiveSearch(p, query)) return false;
      return true;
    });
  }, [savedOnly, isSaved, tag, model, aspectRatio, query, parsedParameters]);

  function filter(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next, { replace: true });
  }

  const toggleSelectPrompt = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds(filtered.map((p) => p.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const copySelectedPrompts = async () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const combined = selectedPrompts.map((p) => p.prompt).join("\n\n");
    const current = ++batchRequest.current;
    if (batchTimer.current) clearTimeout(batchTimer.current);
    try {
      await copyText(combined);
      if (current !== batchRequest.current) return;
      setBatchCopied("copied");
      batchTimer.current = setTimeout(() => setBatchCopied(""), 2000);
    } catch {
      if (current !== batchRequest.current) return;
      setBatchCopied("failed");
      batchTimer.current = setTimeout(() => setBatchCopied(""), 4000);
    }
  };

  const exportSelectedDossier = () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const markdown = generateMarkdownDossier(selectedPrompts);
    const date = new Date().toISOString().split("T")[0];
    downloadFile(
      `portrait-edit-dossier-${date}.md`,
      markdown,
      "text/markdown;charset=utf-8",
    );
  };

  const exportSelectedJson = () => {
    const selectedPrompts = prompts.filter((p) => selectedIds.includes(p.id));
    const date = new Date().toISOString().split("T")[0];
    downloadFile(
      `portrait-edit-selection-${date}.json`,
      JSON.stringify(selectedPrompts, null, 2),
      "application/json",
    );
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const studyA = prompts.find((p) => p.id === compareIds[0]);
  const studyB = prompts.find((p) => p.id === compareIds[1]);

  return (
    <section className="archive" ref={archive}>
      <header>
        <p className="eyebrow">The working collection</p>
        <h1>Portrait prompts</h1>
        <p className="editorial-intro">
          References, language, and the decisions behind an image.
        </p>
      </header>
      <form className="archive-filters" onSubmit={(e) => e.preventDefault()}>
        <label>
          Search
          <input
            ref={searchInput}
            type="search"
            placeholder={t("Light, texture, study number…")}
            value={query}
            onChange={(e) => filter("q", e.target.value)}
          />
        </label>
        <div className="archive-disclosures">
          <details className="archive-disclosure">
            <summary>
              More filters
              {secondaryFilterCount > 0 && ` (${secondaryFilterCount})`}
            </summary>
            <div className="archive-secondary-filters">
              <label>
                Style / tag
                <select
                  value={tag}
                  onChange={(e) => filter("tag", e.target.value)}
                >
                  <option value="">{t("All styles")}</option>
                  {tags.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {models.length > 0 && (
                <label>
                  Model
                  <select
                    value={model}
                    onChange={(e) => filter("model", e.target.value)}
                  >
                    <option value="">{t("All models")}</option>
                    {models.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                    {hasUnspecifiedModels && (
                      <option value="Unspecified">Unspecified</option>
                    )}
                  </select>
                </label>
              )}
              {aspectRatios.length > 0 && (
                <label>
                  {t("Aspect Ratio")}
                  <select
                    value={aspectRatio}
                    onChange={(e) => filter("ar", e.target.value)}
                  >
                    <option value="">{t("All aspect ratios")}</option>
                    {aspectRatios.map((ar) => (
                      <option key={ar} value={ar}>
                        {ar}
                      </option>
                    ))}
                    {hasUnrecordedRatios && (
                      <option value={NOT_RECORDED}>{t("Not recorded")}</option>
                    )}
                  </select>
                </label>
              )}
            </div>
            {(!models.length || !aspectRatios.length) && (
              <p className="archive-metadata-note">
                {[
                  !models.length && "Model",
                  !aspectRatios.length && "aspect ratio",
                ]
                  .filter(Boolean)
                  .join(" and ")}{" "}
                metadata is not yet recorded for these studies.
              </p>
            )}
          </details>
          <details className="archive-disclosure">
            <summary>
              Archive tools{selectionMode ? " · Selecting" : ""}
            </summary>
            <div className="archive-actions-group">
              {/* Multi-Select Batch Mode Toggle */}
              <Button
                type="button"
                variant="ghost"
                className={`selection-mode-toggle-btn ${selectionMode ? "is-active" : ""}`}
                aria-pressed={selectionMode}
                aria-label={
                  selectionMode ? t("Cancel Selection") : t("Select Prompts")
                }
                onClick={() => {
                  setSelectionMode((prev) => {
                    if (prev) setSelectedIds([]);
                    return !prev;
                  });
                }}
              >
                {selectionMode ? t("Cancel Selection") : t("Select Prompts")}
              </Button>

              {selectionMode && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={selectAllFiltered}
                    aria-label="Select All Filtered"
                  >
                    Select All ({filtered.length})
                  </Button>
                  {selectedIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearSelection}
                      aria-label="Clear Selection"
                    >
                      Clear Selection
                    </Button>
                  )}
                </>
              )}

              {/* Collection Moodboard Selector */}
              <label className="moodboard-select-label">
                <span className="sr-only">Collection</span>
                <select
                  aria-label="Moodboard collection"
                  value={activeCollection}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewCol(true);
                    } else {
                      setActiveCollection(e.target.value);
                    }
                  }}
                >
                  {collections.map((c) => (
                    <option key={c} value={c}>
                      Collection: {c}
                    </option>
                  ))}
                  <option value="__new__">+ New Collection…</option>
                </select>
              </label>

              {showNewCol && (
                <div className="new-collection-inline">
                  <input
                    type="text"
                    aria-label="Collection name"
                    placeholder="Collection name…"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newColName.trim()) {
                          createCollection(newColName.trim());
                          setNewColName("");
                          setShowNewCol(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newColName.trim()) {
                        createCollection(newColName.trim());
                        setNewColName("");
                        setShowNewCol(false);
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewCol(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                className="export-saved-btn print-contact-sheet-btn"
                onClick={printSelection}
                disabled={preparingPrint || filtered.length === 0}
                aria-busy={preparingPrint}
                title="Print editorial contact sheet (@media print)"
              >
                {preparingPrint
                  ? t("Preparing sheet…")
                  : t("Print Contact Sheet 🖨")}
              </Button>

              {savedCount > 0 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="export-saved-btn"
                    onClick={exportSaved}
                    title="Export collection as JSON"
                  >
                    <IconText>{t("Export JSON ↗")}</IconText>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="export-saved-btn"
                    onClick={exportMarkdown}
                    title="Export collection as Markdown"
                  >
                    <IconText>Export Markdown ↗</IconText>
                  </Button>
                </>
              )}
            </div>
          </details>
        </div>
      </form>

      <div className="archive-results-bar">
        <p role="status" className="results-count">
          {filtered.length} {filtered.length === 1 ? "study" : "studies"}
        </p>
        <Button
          type="button"
          variant="ghost"
          className={`saved-pill-btn ${savedOnly ? "is-active" : ""}`}
          aria-pressed={savedOnly}
          onClick={() => filter("saved", savedOnly ? "" : "1")}
        >
          ★ Saved ({savedCount})
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            className="reset-filters-btn"
            onClick={() => {
              setSearch({});
              searchInput.current?.focus();
            }}
            aria-label="Reset all filters"
          >
            Reset all
          </Button>
        )}
      </div>
      {(query || tag || model || aspectRatio) && (
        <ul className="archive-active-filters" aria-label="Active filters">
          {[
            query && { key: "q", label: `Search: “${query}”` },
            tag && { key: "tag", label: `Style: #${tag}` },
            model && { key: "model", label: `Model: ${model}` },
            aspectRatio && {
              key: "ar",
              label: `Aspect ratio: ${aspectRatio === NOT_RECORDED ? "Not recorded" : aspectRatio}`,
            },
          ]
            .filter((item): item is { key: string; label: string } =>
              Boolean(item),
            )
            .map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="active-filter-chip"
                  aria-label={`Remove ${item.label} filter`}
                  onClick={() => {
                    filter(item.key, "");
                    searchInput.current?.focus();
                  }}
                >
                  <span>{item.label}</span>
                  <span className="active-filter-remove" aria-hidden="true">
                    ×
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {/* Interactive Tag Pills */}
      <div className="archive-tag-pills" role="region" aria-label="Tag filters">
        <span className="tag-pills-label">Tags:</span>
        <div className="tag-pills-primary">
          {popularTags.map(tagButton)}
          {(!tagsExpanded || !tablet) &&
            selectedAdditionalTag &&
            tagButton(selectedAdditionalTag)}
          <button
            ref={moreTagsButton}
            type="button"
            className="tag-pill tag-disclosure"
            aria-expanded={tagsExpanded}
            aria-haspopup={!tablet ? "dialog" : undefined}
            aria-controls="archive-extra-tags"
            onClick={() => setTagsExpanded((expanded) => !expanded)}
          >
            {tagsExpanded && tablet
              ? "Fewer tags"
              : `More tags (${hiddenTagCount})`}
          </button>
          {tag && (
            <button
              type="button"
              className="tag-pill"
              onClick={() => {
                filter("tag", "");
                moreTagsButton.current?.focus();
              }}
            >
              Clear tag
            </button>
          )}
        </div>
        {tablet ? (
          <div
            id="archive-extra-tags"
            className="tag-pills-extra"
            hidden={!tagsExpanded}
          >
            {additionalTags.map(tagButton)}
          </div>
        ) : tagsExpanded ? (
          <ArchiveTagPicker
            tags={tagCounts}
            selected={tag}
            onSelect={(value) => filter("tag", value)}
            onClose={() => setTagsExpanded(false)}
          />
        ) : null}
      </div>

      {/* Printable Contact Sheet Header (@media print) */}
      <div className="print-contact-sheet-header" aria-hidden="true">
        <div className="print-header-masthead">
          <h2>THE PORTRAIT EDIT — ISSUE 02: THE PROMPT ISSUE</h2>
          <span>EDITORIAL CONTACT SHEET</span>
        </div>
        <div className="print-header-details">
          <p>
            {savedOnly ? (
              <>
                Curated Collection: <strong>{activeCollection}</strong>
              </>
            ) : (
              <strong>Archive selection</strong>
            )}
            {tag && ` · #${tag}`}
            {model && ` · ${model}`}
            {aspectRatio && ` · ${aspectRatio}`}
            {query && ` · “${query}”`}
          </p>
          <p>
            {filtered.length} {filtered.length === 1 ? "study" : "studies"} ·
            Printed{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="print-header-line" />
      </div>

      <div className="archive-grid">
        {filtered.map((p) => (
          <StudyCard
            key={p.id}
            prompt={p}
            to={`/prompts/${p.id}`}
            onOpen={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                event.shiftKey
              )
                return;
              event.preventDefault();
              const archiveContext = {
                search: location.search,
                scrollY: window.scrollY,
                studyId: p.id,
                tagsExpanded,
              };
              // Snapshot the existing entry so native Back restores it too.
              navigate(location.pathname + location.search, {
                replace: true,
                state: { archiveReturn: archiveContext },
              });
              navigate(`/prompts/${p.id}`, {
                state: { archiveContext },
              });
            }}
            headingLevel="h2"
            isSaved={isSaved(p.id)}
            onToggleSaved={toggleSaved}
            onTagClick={(t) => filter("tag", t)}
            isComparing={compareIds.includes(p.id)}
            onToggleCompare={toggleCompare}
            selectionMode={selectionMode}
            isSelected={selectedIds.includes(p.id)}
            onToggleSelect={toggleSelectPrompt}
          />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <p>
            {savedOnly
              ? savedCount === 0
                ? activeCollection === "Default"
                  ? "No saved studies in your Default collection yet. Select the bookmark icon on any study to save it to this collection."
                  : `No saved studies in your “${activeCollection}” collection yet. Select the bookmark icon on any study to save it to this collection.`
                : activeCollection === "Default"
                  ? "No saved studies in your Default collection match these filters."
                  : `No saved studies in your “${activeCollection}” collection match these filters.`
              : t(
                  "No studies match these filters. Try a broader search or clear the filters.",
                )}
          </p>
          {savedOnly && (query || tag || model || aspectRatio) && (
            <p className="empty-state-filters">
              Active filters remain applied:{" "}
              {[
                query && `Search: “${query}”`,
                tag && `Style: #${tag}`,
                model && `Model: ${model}`,
                aspectRatio &&
                  `Aspect ratio: ${aspectRatio === NOT_RECORDED ? "Not recorded" : aspectRatio}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </p>
          )}
          {savedOnly && (
            <div className="empty-state-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  filter("saved", "");
                  searchInput.current?.focus();
                }}
              >
                {t("Browse studies")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Floating comparison dock */}
      {compareIds.length > 0 && (
        <aside
          className="compare-floating-dock"
          aria-label="Compare selection dock"
        >
          <div className="compare-dock-content">
            <span className="compare-dock-count">
              Selected {compareIds.length}/2 for comparison
            </span>
            <div className="compare-dock-actions">
              <Button
                type="button"
                variant="default"
                disabled={compareIds.length < 2}
                onClick={(event) => {
                  event.currentTarget.focus();
                  setCompareOpen(true);
                }}
                className="dock-compare-btn"
              >
                {t("Compare 2 studies ⇄")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCompareIds([])}
                className="dock-clear-btn"
              >
                Clear
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Floating Batch Selection Toolbar */}
      {selectedIds.length > 0 && (
        <aside
          className="batch-floating-toolbar"
          role="region"
          aria-label="Batch actions toolbar"
        >
          <div className="batch-toolbar-content">
            <span className="batch-toolbar-count">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "prompt" : "prompts"} selected
            </span>
            <span className="sr-only batch-copy-status" role="status">
              {batchCopied === "copied"
                ? `${selectedIds.length} prompts copied.`
                : ""}
            </span>
            {batchCopied === "failed" && (
              <span className="batch-copy-error" role="alert">
                Copy unavailable. Export the dossier or copy prompts one at a
                time.
              </span>
            )}
            <div className="batch-toolbar-actions">
              <Button
                type="button"
                variant="default"
                className="batch-copy-btn"
                onClick={copySelectedPrompts}
                aria-label="Copy Prompts"
              >
                {batchCopied === "copied" ? "Copied!" : "Copy Prompts"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="batch-dossier-btn"
                onClick={exportSelectedDossier}
                aria-label="Export Markdown Dossier"
                title="Download curated Markdown dossier (.md)"
              >
                <IconText>Export Markdown Dossier ↗</IconText>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="batch-json-btn"
                onClick={exportSelectedJson}
                aria-label="Export JSON"
                title="Download selection as JSON (.json)"
              >
                <IconText>Export JSON ↗</IconText>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="batch-clear-btn"
                onClick={clearSelection}
                aria-label="Clear"
              >
                Clear
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Compare Lab Modal */}
      {compareOpen && studyA && studyB && (
        <Suspense fallback={null}>
          <CompareLab
            studyA={studyA}
            studyB={studyB}
            isOpen={compareOpen}
            onClose={() => setCompareOpen(false)}
            onSwap={() => setCompareIds([compareIds[1], compareIds[0]])}
            onInspectImage={(src, alt, title) =>
              setLightbox({ src, alt, title })
            }
          />
        </Suspense>
      )}

      {/* Lightbox for inspect triggers */}
      {lightbox && (
        <Suspense fallback={null}>
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            title={lightbox.title}
            isOpen={Boolean(lightbox)}
            onClose={() => setLightbox(null)}
          />
        </Suspense>
      )}

      {printProgress && (
        <div
          className="print-progress-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-progress-title"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-lg bg-white px-5 py-4 text-neutral-900 shadow-lg">
            <p id="print-progress-title" className="mb-3 font-medium">
              {printProgress.opening
                ? "Opening print dialog..."
                : `Loading images... ${printProgress.loaded}/${printProgress.total}`}
            </p>
            {!printProgress.opening && (
              <Button type="button" variant="ghost" onClick={cancelPrint}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
