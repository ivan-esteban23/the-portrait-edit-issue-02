import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { editable } from "@/lib/utils";
import type { Theme } from "./useTheme";

interface ReaderKeyboardOptions {
  settings: boolean;
  shortcutsOpen: boolean;
  setTableOfContentsOpen: Dispatch<SetStateAction<boolean>>;
  getFocus: () => boolean;
  toggleFocus: (focus: boolean) => void;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  hasStudy: boolean;
  toggleStudyBookmark: () => void;
  toggleSlideshow: () => void;
  toggleFullscreen: () => void;
  setMode: Dispatch<SetStateAction<"page" | "text">>;
  spreadCapable: boolean;
  spread: boolean;
  setSpread: (spread: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  turnPage: (delta: number) => void;
  go: (page: number) => void;
  pageCount: number;
}

export function useReaderKeyboard(options: ReaderKeyboardOptions) {
  const latest = useRef(options);
  latest.current = options;
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const {
      settings,
      shortcutsOpen,
      setTableOfContentsOpen,
      getFocus,
      toggleFocus,
      setShortcutsOpen,
      hasStudy,
      toggleStudyBookmark,
      toggleSlideshow,
      toggleFullscreen,
      setMode,
      spreadCapable,
      spread,
      setSpread,
      theme,
      setTheme,
      turnPage,
      go,
      pageCount,
    } = latest.current;
    if (
      e.defaultPrevented ||
      editable(e.target) ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      settings ||
      document.querySelector('[role="dialog"][aria-modal="true"]')
    )
      return;

    if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      setShortcutsOpen((o) => !o);
      return;
    }

    if (e.key === "Escape") {
      if (shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      if (getFocus()) {
        e.preventDefault();
        toggleFocus(false);
        return;
      }
    }

    const k = e.key.toLowerCase();
    if (k === "b" && !e.repeat && hasStudy) {
      e.preventDefault();
      toggleStudyBookmark();
    }
    if (k === "p" && !e.repeat) {
      e.preventDefault();
      toggleSlideshow();
    }
    if (k === "f" && !e.repeat) {
      e.preventDefault();
      toggleFullscreen();
    }
    if (k === "r" && !e.repeat) {
      e.preventDefault();
      setMode((m) => (m === "page" ? "text" : "page"));
    }
    if (k === "t" && !e.repeat) {
      e.preventDefault();
      setTableOfContentsOpen((open) => !open);
    }
    if (k === "s" && !e.repeat && spreadCapable) {
      e.preventDefault();
      setSpread(!spread);
    }
    if (k === "m" && !e.repeat) {
      e.preventDefault();
      const nextTheme =
        theme === "system"
          ? "light"
          : theme === "light"
            ? "paper"
            : theme === "paper"
              ? "dark"
              : "system";
      setTheme(nextTheme);
    }
    if (["ArrowRight", "j", "J"].includes(e.key)) {
      e.preventDefault();
      turnPage(1);
    }
    if (["ArrowLeft", "k", "K"].includes(e.key)) {
      e.preventDefault();
      turnPage(-1);
    }
    if (e.key === "Home") {
      e.preventDefault();
      go(1);
    }
    if (e.key === "End") {
      e.preventDefault();
      go(pageCount);
    }
  }, []);
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
  return onKeyDown;
}
