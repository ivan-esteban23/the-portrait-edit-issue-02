import { useSyncExternalStore } from "react";
import type { Issue } from "@/content/schema";

const KEY = "portrait-edit-last-read";
const CHANGED = "portrait-edit-reading-progress";

function readProgress(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).filter(
          ([, page]) => Number.isInteger(page) && page > 0,
        ),
      );
    }
  } catch {
    // Private browsing and malformed storage still allow reading normally.
  }
  return {};
}

export function saveReadingProgress(slug: string, page: number) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...readProgress(), [slug]: page }),
    );
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Reading remains available if storage is full or blocked.
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function useLastReadPage(
  issue: Pick<Issue, "slug" | "pages"> | undefined,
) {
  return useSyncExternalStore(
    subscribe,
    () => {
      const page = issue ? readProgress()[issue.slug] : undefined;
      return page && issue && page <= issue.pages ? page : 1;
    },
    () => 1,
  );
}
