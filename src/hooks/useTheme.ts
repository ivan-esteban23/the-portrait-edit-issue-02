import { useCallback, useEffect, useState } from "react";

export type Theme =
  "system" | "light" | "dark" | "paper" | "sepia" | "midnight";

const STORAGE_KEY = "portrait-edit-theme";
const THEME_COLORS: Record<Exclude<Theme, "system">, string> = {
  light: "#f7f5f0",
  paper: "#f2ece0",
  dark: "#121212",
  sepia: "#f6f0e5",
  midnight: "#06080f",
};
const THEME_EVENT = "portrait-edit-theme-change";
let transientTheme: Theme | null = null;

function isTheme(value: unknown): value is Theme {
  return (
    value === "system" ||
    value === "light" ||
    value === "dark" ||
    value === "paper" ||
    value === "sepia" ||
    value === "midnight"
  );
}
function readTheme(): Theme {
  if (transientTheme !== null) return transientTheme;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const setTheme = useCallback((newTheme: Theme) => {
    if (!isTheme(newTheme)) return;
    setThemeState(newTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, newTheme);
      transientTheme = null;
    } catch {
      /* Preserve the preference across route mounts when storage is blocked or full. */
      transientTheme = newTheme;
    }
    window.dispatchEvent(
      new CustomEvent<Theme>(THEME_EVENT, { detail: newTheme }),
    );
  }, []);

  useEffect(() => {
    const syncLocal = (event: Event) => {
      const value: unknown = (event as CustomEvent).detail;
      if (isTheme(value)) setThemeState(value);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage)
          return;
      } catch {
        return;
      }
      transientTheme = null;
      setThemeState(isTheme(event.newValue) ? event.newValue : "system");
    };
    window.addEventListener(THEME_EVENT, syncLocal);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, syncLocal);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateToolbar = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      const color = THEME_COLORS[resolved];
      const tags = document.querySelectorAll<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );
      if (tags.length) {
        tags.forEach((meta) => meta.setAttribute("content", color));
      } else {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = color;
        document.head.appendChild(meta);
      }
    };
    updateToolbar();
    if (theme === "system") {
      media.addEventListener("change", updateToolbar);
      return () => media.removeEventListener("change", updateToolbar);
    }
  }, [theme]);

  return { theme, setTheme };
}
