import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useBookmarks,
  DEFAULT_COLLECTIONS,
  BOOKMARK_REMOVED,
} from "@/hooks/useBookmarks";

/* ------------------------------------------------------------------ */
/*  localStorage mock                                                  */
/* ------------------------------------------------------------------ */

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    /** Direct access for test assertions. */
    _store: store,
  };
}

let storageMock: ReturnType<typeof createStorageMock>;

beforeEach(() => {
  storageMock = createStorageMock();
  vi.stubGlobal("localStorage", storageMock);
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Mock @/content so the hook doesn't try to resolve import.meta.glob.
 */
vi.mock("@/content", () => ({
  prompts: [
    { id: "study-a", studyNumber: 1 },
    { id: "study-b", studyNumber: 2 },
    { id: "study-c", studyNumber: 3 },
  ],
  assetUrl: (p: string) => p,
}));

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("useBookmarks", () => {
  /* ---- Initialisation ---- */

  it("starts with the default collections and empty bookmark lists", () => {
    const { result } = renderHook(() => useBookmarks());

    expect(result.current.collections).toEqual(
      expect.arrayContaining(DEFAULT_COLLECTIONS),
    );
    expect(result.current.activeCollection).toBe("Default");
    expect(result.current.savedIds).toEqual([]);
    expect(result.current.savedCount).toBe(0);
  });

  /* ---- Adding / removing bookmarks ---- */

  it("toggleSaved adds a bookmark to the active collection", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a"));

    expect(result.current.savedIds).toContain("study-a");
    expect(result.current.savedCount).toBe(1);
    expect(result.current.isSaved("study-a")).toBe(true);
  });

  it("toggleSaved removes a bookmark when toggled twice", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a"));
    act(() => result.current.toggleSaved("study-a"));

    expect(result.current.savedIds).not.toContain("study-a");
    expect(result.current.savedCount).toBe(0);
    expect(result.current.isSaved("study-a")).toBe(false);
  });

  it("dispatches BOOKMARK_REMOVED CustomEvent when removing a bookmark", () => {
    const handler = vi.fn();
    window.addEventListener(BOOKMARK_REMOVED, handler);

    const { result } = renderHook(() => useBookmarks());
    act(() => result.current.toggleSaved("study-b"));
    act(() => result.current.toggleSaved("study-b")); // remove

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ id: "study-b", collection: "Default" });

    window.removeEventListener(BOOKMARK_REMOVED, handler);
  });

  /* ---- isSaved ---- */

  it("isSaved returns false for unsaved study", () => {
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.isSaved("study-x")).toBe(false);
  });

  it("isSaved returns true for saved study", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => result.current.toggleSaved("study-c"));
    expect(result.current.isSaved("study-c")).toBe(true);
  });

  /* ---- restoreSaved ---- */

  it("restoreSaved re-adds a removed bookmark to a specific collection", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a"));
    act(() => result.current.toggleSaved("study-a")); // remove
    expect(result.current.isSaved("study-a")).toBe(false);

    act(() => result.current.restoreSaved("study-a", "Default"));
    expect(result.current.isSaved("study-a")).toBe(true);
  });

  it("restoreSaved is a no-op if the bookmark already exists", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a"));
    const countBefore = result.current.savedCount;

    act(() => result.current.restoreSaved("study-a", "Default"));
    expect(result.current.savedCount).toBe(countBefore);
  });

  /* ---- Collections: creating ---- */

  it("createCollection adds a new collection and switches to it", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.createCollection("Cinematic"));

    expect(result.current.collections).toContain("Cinematic");
    expect(result.current.activeCollection).toBe("Cinematic");
    expect(result.current.savedIds).toEqual([]);
  });

  it("createCollection is a no-op for empty or duplicate names", () => {
    const { result } = renderHook(() => useBookmarks());
    const initialLength = result.current.collections.length;

    act(() => result.current.createCollection(""));
    expect(result.current.collections.length).toBe(initialLength);

    act(() => result.current.createCollection("Default"));
    expect(result.current.collections.length).toBe(initialLength);
  });

  /* ---- Collections: deleting ---- */

  it("deleteCollection removes a collection and resets active collection if deleted", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.createCollection("Temporary"));
    expect(result.current.collections).toContain("Temporary");
    expect(result.current.activeCollection).toBe("Temporary");

    act(() => result.current.deleteCollection("Temporary"));
    expect(result.current.collections).not.toContain("Temporary");
    expect(result.current.activeCollection).toBe("Default");
  });

  it("deleteCollection does not delete the Default collection", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.deleteCollection("Default"));
    expect(result.current.collections).toContain("Default");
  });

  /* ---- Collections: switching ---- */

  it("setActiveCollection switches the active collection", () => {
    const { result } = renderHook(() => useBookmarks());

    // Add a bookmark to Default
    act(() => result.current.toggleSaved("study-a"));
    expect(result.current.isSaved("study-a")).toBe(true);

    // Switch to Studio Lighting (starts empty)
    act(() => result.current.setActiveCollection("Studio Lighting"));
    expect(result.current.activeCollection).toBe("Studio Lighting");
    expect(result.current.isSaved("study-a")).toBe(false);
    expect(result.current.savedCount).toBe(0);
  });

  it("bookmarks are scoped to their collection", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a")); // in Default
    act(() => result.current.setActiveCollection("Studio Lighting"));
    act(() => result.current.toggleSaved("study-b")); // in Studio Lighting

    // Studio Lighting should have study-b only
    expect(result.current.isSaved("study-b")).toBe(true);
    expect(result.current.isSaved("study-a")).toBe(false);

    // Switch back to Default
    act(() => result.current.setActiveCollection("Default"));
    expect(result.current.isSaved("study-a")).toBe(true);
    expect(result.current.isSaved("study-b")).toBe(false);
  });

  /* ---- localStorage persistence ---- */

  it("persists collections to localStorage", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggleSaved("study-a"));

    expect(storageMock.setItem).toHaveBeenCalledWith(
      "portrait-edit-collections",
      expect.any(String),
    );

    const stored = JSON.parse(
      storageMock._store.get("portrait-edit-collections")!,
    );
    expect(stored["Default"]).toContain("study-a");
  });

  it("persists active collection name to localStorage", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.createCollection("Cinematic"));

    expect(storageMock._store.get("portrait-edit-active-collection")).toBe(
      "Cinematic",
    );
  });

  it("restores collections from localStorage on mount", () => {
    const data = {
      Default: ["study-a", "study-b"],
      "Studio Lighting": ["study-c"],
      "Noir & Grain": [],
    };
    storageMock._store.set(
      "portrait-edit-collections",
      JSON.stringify(data),
    );
    storageMock._store.set("portrait-edit-active-collection", "Studio Lighting");

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.activeCollection).toBe("Studio Lighting");
    expect(result.current.savedIds).toEqual(["study-c"]);
  });

  /* ---- Migration from legacy format ---- */

  it("migrates from portrait-edit-saved (flat array) to collections format", () => {
    // Simulate the legacy format: only portrait-edit-saved exists, no collections key
    storageMock._store.set(
      "portrait-edit-saved",
      JSON.stringify(["study-a", "study-c"]),
    );

    const { result } = renderHook(() => useBookmarks());

    // Legacy data should be migrated into the Default collection
    expect(result.current.activeCollection).toBe("Default");
    expect(result.current.savedIds).toEqual(["study-a", "study-c"]);
    expect(result.current.isSaved("study-a")).toBe(true);
    expect(result.current.isSaved("study-c")).toBe(true);
  });

  it("ignores legacy data when collections key already exists", () => {
    storageMock._store.set(
      "portrait-edit-saved",
      JSON.stringify(["study-a"]),
    );
    storageMock._store.set(
      "portrait-edit-collections",
      JSON.stringify({ Default: ["study-b"], "Studio Lighting": [] , "Noir & Grain": [] }),
    );

    const { result } = renderHook(() => useBookmarks());

    // Should use the collections data, not legacy
    expect(result.current.savedIds).toEqual(["study-b"]);
    expect(result.current.isSaved("study-a")).toBe(false);
  });

  /* ---- Cross-instance sync via CustomEvent ---- */

  it("syncs collections when a BOOKMARKS_CHANGED CustomEvent fires", () => {
    const { result } = renderHook(() => useBookmarks());

    const updatedCollections = {
      Default: ["study-a", "study-b"],
      "Studio Lighting": [],
      "Noir & Grain": [],
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent("portrait-edit-bookmarks-changed", {
          detail: {
            collections: updatedCollections,
            activeCollection: "Default",
          },
        }),
      );
    });

    expect(result.current.savedIds).toEqual(["study-a", "study-b"]);
  });
});
