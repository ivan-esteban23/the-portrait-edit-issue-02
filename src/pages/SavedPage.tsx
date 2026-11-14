import { IconText } from "@/components/ui/IconText";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { prompts } from "@/content";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePageMeta } from "@/hooks/usePageMeta";
import { responsiveImageProps } from "@/lib/responsiveImages";
import {
  allSavedIds,
  removeCollection,
  removeSavedIds,
  type Collections,
} from "@/lib/savedCollections";
const CompareLab = lazy(() =>
  import("@/components/CompareLab").then((m) => ({ default: m.CompareLab })),
);

export function SavedPage() {
  const { collectionData, replaceCollections, activeCollection } =
    useBookmarks();
  const [params, setParams] = useSearchParams();
  const requested = params.get("collection") || "";
  const group = Object.hasOwn(collectionData, requested) ? requested : "";
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("issue");
  const [name, setName] = useState(""),
    [rename, setRename] = useState("");
  const [destination, setDestination] = useState("Default");
  const [selected, setSelected] = useState<string[]>([]),
    [comparing, setComparing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [undo, setUndo] = useState<{
    groups: Collections;
    active: string;
  } | null>(null);
  usePageMeta({
    title: "Saved collections | The Portrait Edit",
    description:
      "Revisit, organize and compare your saved portrait studies. Collections stay in this browser.",
    path: "/saved",
  });
  const ids = group ? collectionData[group] : allSavedIds(collectionData);
  const visible = useMemo(
    () =>
      prompts
        .filter(
          (p) =>
            ids.includes(p.id) &&
            `${p.title} ${p.style} ${p.tags.join(" ")} ${p.studyNumber} ${p.id}`
              .toLowerCase()
              .includes(query.toLowerCase().trim()),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : sort === "recent"
              ? ids.indexOf(b.id) - ids.indexOf(a.id)
              : a.studyNumber - b.studyNumber,
        ),
    [ids, query, sort],
  );
  function commit(
    next: Collections,
    message: string,
    active = activeCollection,
  ) {
    if (!replaceCollections(next, active)) {
      setFeedback(
        "Unable to save changes in this browser. Your collection has not changed.",
      );
      return false;
    }
    setUndo({ groups: collectionData, active: activeCollection });
    setFeedback(message);
    return true;
  }
  function validName(value: string) {
    const clean = value.trim();
    if (
      !clean ||
      clean.length > 60 ||
      Object.hasOwn(collectionData, clean) ||
      ["__proto__", "constructor", "prototype"].includes(clean)
    ) {
      setFeedback("Choose a unique collection name of 1–60 characters.");
      return "";
    }
    return clean;
  }
  function changeGroup(value: string) {
    setParams(value ? { collection: value } : {});
    setSelected([]);
    setRename("");
  }
  function exportCollection() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            collections: collectionData,
            studies: prompts.filter((p) =>
              allSavedIds(collectionData).includes(p.id),
            ),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "portrait-edit-saved-collections.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pair = selected.map((id) => prompts.find((p) => p.id === id)!);
  return (
    <section className="saved-library">
      <header className="library-intro">
        <p className="eyebrow">Your working archive</p>
        <h1>Keep what catches your eye.</h1>
        <p>
          A collection of references, prompts, and possibilities. Saved in this
          browser.
        </p>
        <Link to="/prompts">
          <IconText>Find more studies ↗</IconText>
        </Link>
      </header>
      <div className="library-layout">
        <aside className="library-sidebar">
          <h2>Collections</h2>
          <nav aria-label="Saved collections">
            <Link
              aria-current={!group ? "page" : undefined}
              to="/saved"
              onClick={() => changeGroup("")}
            >
              All saved <span>{allSavedIds(collectionData).length}</span>
            </Link>
            {Object.entries(collectionData).map(([key, values]) => (
              <Link
                key={key}
                to={`/saved?collection=${encodeURIComponent(key)}`}
                aria-current={group === key ? "page" : undefined}
                onClick={() => changeGroup(key)}
              >
                {key}
                <span>{values.length}</span>
              </Link>
            ))}
          </nav>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = validName(name);
              if (
                clean &&
                commit(
                  { ...collectionData, [clean]: [] },
                  `Created “${clean}”.`,
                )
              ) {
                setName("");
                changeGroup(clean);
              }
            }}
          >
            <label htmlFor="new-collection">New collection</label>
            <input
              id="new-collection"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Soft light"
              required
            />
            <button type="submit">Create collection +</button>
          </form>
          <button onClick={exportCollection}>
            <IconText>Export saved collection ↓</IconText>
          </button>
        </aside>
        <div className="library-content">
          <header className="library-heading">
            <h2>{group || "All saved"}</h2>
            <span>
              {visible.length} {visible.length === 1 ? "study" : "studies"}
            </span>
          </header>
          {group && group !== "Default" && (
            <form
              className="library-manage"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = validName(rename);
                if (!clean) return;
                const next = {
                  ...collectionData,
                  [clean]: collectionData[group],
                };
                delete next[group];
                if (
                  commit(
                    next,
                    `Renamed to “${clean}”.`,
                    activeCollection === group ? clean : activeCollection,
                  )
                )
                  changeGroup(clean);
              }}
            >
              <label>
                Rename collection
                <input
                  value={rename}
                  maxLength={60}
                  placeholder={group}
                  onChange={(e) => setRename(e.target.value)}
                  required
                />
              </label>
              <button type="submit">Rename</button>
              <button
                type="button"
                onClick={() => {
                  if (
                    commit(
                      removeCollection(collectionData, group),
                      "Collection deleted. Its studies remain in All saved.",
                    )
                  )
                    changeGroup("");
                }}
              >
                Delete collection
              </button>
            </form>
          )}
          <div className="library-find">
            <label>
              Search saved studies
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, light, style, study number…"
              />
            </label>
            <label>
              Order
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="issue">Issue order</option>
                <option value="recent">Recently saved</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
          <div className="library-toolbar">
            <span>Select up to two studies to compare.</span>
            <button
              disabled={selected.length !== 2}
              onClick={() => setComparing(true)}
            >
              Compare selected ({selected.length}/2)
            </button>
            <label>
              Add selected to
              <select
                value={
                  Object.hasOwn(collectionData, destination)
                    ? destination
                    : "Default"
                }
                onChange={(e) => setDestination(e.target.value)}
              >
                {Object.keys(collectionData).map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
            <button
              disabled={!selected.length}
              onClick={() => {
                const target = Object.hasOwn(collectionData, destination)
                  ? destination
                  : "Default";
                commit(
                  {
                    ...collectionData,
                    [target]: [
                      ...new Set([
                        ...(collectionData[target] || []),
                        ...selected,
                      ]),
                    ],
                  },
                  `Added to “${target}”.`,
                );
              }}
            >
              Add to collection
            </button>
          </div>
          <div className="library-feedback" role="status">
            {feedback}
            {undo && (
              <button
                onClick={() => {
                  if (replaceCollections(undo.groups, undo.active)) {
                    setUndo(null);
                    setFeedback("Change undone.");
                    setSelected([]);
                  } else setFeedback("Unable to restore this change.");
                }}
              >
                Undo
              </button>
            )}
          </div>
          {!visible.length ? (
            <div className="library-empty">
              <h3>
                {ids.length
                  ? "No matching studies."
                  : "A space for your next idea."}
              </h3>
              <p>
                {ids.length
                  ? "Try another title or style."
                  : "Use “Save study” on any portrait to begin your collection."}
              </p>
              <Link to="/prompts">
                <IconText>Explore the archive ↗</IconText>
              </Link>
            </div>
          ) : (
            <div className="library-grid">
              {visible.map((p) => (
                <article className="library-card" key={p.id}>
                  <Link className="library-image" to={`/prompts/${p.id}`}>
                    <img
                      {...responsiveImageProps(p.referenceImage, "archive")}
                      alt={p.title}
                      loading="lazy"
                    />
                  </Link>
                  <p className="eyebrow">
                    Study {String(p.studyNumber).padStart(3, "0")} / Page{" "}
                    {p.page}
                  </p>
                  <h3>
                    <Link to={`/prompts/${p.id}`}>{p.title}</Link>
                  </h3>
                  <p>{p.style}</p>
                  <label className="library-select">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      disabled={
                        !selected.includes(p.id) && selected.length >= 2
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.id]
                            : selected.filter((id) => id !== p.id),
                        )
                      }
                    />
                    Compare {p.title}
                  </label>
                  <div className="library-card-actions">
                    <Link
                      to={`/prompts/${p.id}?reading=1`}
                      state={{
                        readingReturn: `/saved${group ? `?collection=${encodeURIComponent(group)}` : ""}`,
                      }}
                    >
                      <IconText>Read prompt ↗</IconText>
                    </Link>
                    <button
                      onClick={() => {
                        if (
                          commit(
                            removeSavedIds(
                              collectionData,
                              [p.id],
                              group && group !== "Default" ? group : undefined,
                            ),
                            group && group !== "Default"
                              ? "Removed from collection. Still in All saved."
                              : "Study removed from saved.",
                          )
                        )
                          setSelected(selected.filter((id) => id !== p.id));
                      }}
                    >
                      {group && group !== "Default"
                        ? "Remove from collection"
                        : "Unsave"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      {comparing && pair.length === 2 && (
        <Suspense fallback={null}>
          <CompareLab
            studyA={pair[0]}
            studyB={pair[1]}
            isOpen={comparing}
            onClose={() => setComparing(false)}
            onSwap={() => setSelected([...selected].reverse())}
          />
        </Suspense>
      )}
    </section>
  );
}
