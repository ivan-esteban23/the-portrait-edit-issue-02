import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prompts, assetUrl } from "@/content";

const BOOKMARKS_CHANGED = "portrait-edit-bookmarks-changed";
export const BOOKMARK_REMOVED = "portrait-edit-bookmark-removed";
const STORAGE_KEY = "portrait-edit-saved";
const COLLECTIONS_KEY = "portrait-edit-collections";
const ACTIVE_COLLECTION_KEY = "portrait-edit-active-collection";

export const DEFAULT_COLLECTIONS = ["Default", "Studio Lighting", "Noir & Grain"];

export function useBookmarks() {
  const [activeCollection, setActiveCollectionState] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_COLLECTION_KEY) || "Default";
    } catch {
      return "Default";
    }
  });

  const [collections, setCollections] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(COLLECTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }

    // Initialize from portrait-edit-saved if available
    let initialSaved: string[] = [];
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) initialSaved = parsed;
      }
    } catch {
      /* ignore */
    }

    return {
      Default: initialSaved,
      "Studio Lighting": [],
      "Noir & Grain": [],
    };
  });

  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;

  // Current active collection's saved IDs
  const savedIds = useMemo(
    () => collections[activeCollection] || collections["Default"] || [],
    [collections, activeCollection],
  );

  const persistCollections = useCallback(
    (nextCols: Record<string, string[]>, nextActive: string) => {
      collectionsRef.current = nextCols;
      setCollections(nextCols);
      window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED, {
        detail: { collections: nextCols, activeCollection: nextActive },
      }));
      try {
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(nextCols));
        localStorage.setItem(ACTIVE_COLLECTION_KEY, nextActive);
        // Keep portrait-edit-saved in sync with current active collection for tests & compatibility
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(nextCols[nextActive] || []),
        );
      } catch {
        /* storage error */
      }
    },
    [],
  );

  const setActiveCollection = useCallback(
    (name: string) => {
      setActiveCollectionState(name);
      window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED, {
        detail: { collections, activeCollection: name },
      }));
      try {
        localStorage.setItem(ACTIVE_COLLECTION_KEY, name);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(collections[name] || []),
        );
      } catch {
        /* ignore */
      }
    },
    [collections],
  );

  const createCollection = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || collections[trimmed]) return;
      const nextCols = { ...collections, [trimmed]: [] };
      setActiveCollectionState(trimmed);
      persistCollections(nextCols, trimmed);
    },
    [collections, persistCollections],
  );

  const deleteCollection = useCallback(
    (name: string) => {
      if (name === "Default" || !collections[name]) return;
      const nextCols = { ...collections };
      delete nextCols[name];
      const nextActive =
        activeCollection === name ? "Default" : activeCollection;
      setActiveCollectionState(nextActive);
      persistCollections(nextCols, nextActive);
    },
    [collections, activeCollection, persistCollections],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const latest = collectionsRef.current;
      const currentList = latest[activeCollection] || [];
      const removing = currentList.includes(id);
      const nextList = removing
        ? currentList.filter((item) => item !== id)
        : [...currentList, id];
      persistCollections({ ...latest, [activeCollection]: nextList }, activeCollection);
      if (removing) {
        window.dispatchEvent(
          new CustomEvent(BOOKMARK_REMOVED, {
            detail: { id, collection: activeCollection },
          }),
        );
      }
    },
    [activeCollection, persistCollections],
  );

  const restoreSaved = useCallback(
    (id: string, collection: string) => {
      const latest = collectionsRef.current;
      const currentList = latest[collection] || [];
      if (currentList.includes(id)) return;
      persistCollections(
        { ...latest, [collection]: [...currentList, id] },
        activeCollection,
      );
    },
    [activeCollection, persistCollections],
  );

  const isSaved = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds],
  );

  const exportSaved = useCallback(() => {
    const savedPrompts = prompts.filter((p) => savedIds.includes(p.id));
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(savedPrompts, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `portrait-edit-${activeCollection.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [savedIds, activeCollection]);

  const exportMarkdown = useCallback(() => {
    const savedPrompts = prompts.filter((p) => savedIds.includes(p.id));
    const lines = [
      `# The Portrait Edit — Moodboard: ${activeCollection}`,
      ``,
      `*Curated selection of ${savedPrompts.length} studies from Issue 02 (The Prompt Issue)*  `,
      `*Exported on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · [The Portrait Edit](https://ivan-esteban23.github.io/the-portrait-edit-issue-02/)*`,
      ``,
      `---`,
      ``,
    ];

    savedPrompts.forEach((p, idx) => {
      const paramList = Object.entries(p.parameters || {})
        .map(([k, v]) => `${k} ${v}`)
        .join(" ");

      lines.push(`## ${String(idx + 1).padStart(2, "0")}. ${p.title} (Study #${p.studyNumber})`);
      lines.push(`- **Issue:** Issue 02 · Page ${p.page}`);
      lines.push(`- **Model:** ${p.model || "Midjourney"}`);
      lines.push(`- **Tags:** ${p.tags.map((t) => `#${t}`).join(" ")}`);
      if (paramList) lines.push(`- **Parameters:** \`${paramList}\``);
      lines.push(``);
      lines.push(`### Prompt`);
      lines.push(`> ${p.prompt}`);
      lines.push(``);
      lines.push(`### Reference`);
      lines.push(`![${p.title}](${assetUrl(p.referenceImage)})`);
      lines.push(``);
      if (p.workingNotes) {
        lines.push(`**Working Notes:**  `);
        lines.push(`${p.workingNotes}`);
        lines.push(``);
      }
      if (p.tryThis) {
        lines.push(`**Variations:**  `);
        lines.push(`${p.tryThis}`);
        lines.push(``);
      }
      lines.push(`---`);
      lines.push(``);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute(
      "download",
      `portrait-edit-${activeCollection.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.md`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  }, [savedIds, activeCollection]);

  // Synchronize reader, study cards, and other tabs.
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === COLLECTIONS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === "object") setCollections(parsed);
        } catch {
          /* ignore */
        }
      }
      if (e.key === ACTIVE_COLLECTION_KEY && e.newValue) {
        setActiveCollectionState(e.newValue);
      }
    };
    const syncLocal = (event: Event) => {
      const detail = (event as CustomEvent<{ collections: Record<string, string[]>; activeCollection: string }>).detail;
      collectionsRef.current = detail.collections;
      setCollections(detail.collections);
      setActiveCollectionState(detail.activeCollection);
    };
    window.addEventListener("storage", sync);
    window.addEventListener(BOOKMARKS_CHANGED, syncLocal);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(BOOKMARKS_CHANGED, syncLocal);
    };
  }, []);

  return {
    savedIds,
    isSaved,
    toggleSaved,
    restoreSaved,
    exportSaved,
    exportMarkdown,
    savedCount: savedIds.length,
    activeCollection,
    setActiveCollection,
    createCollection,
    deleteCollection,
    collections: Object.keys(collections),
  };
}
