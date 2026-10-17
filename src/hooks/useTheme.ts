import { useCallback, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark" | "paper";

const STORAGE_KEY = "portrait-edit-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (
        stored === "system" ||
        stored === "light" ||
        stored === "dark" ||
        stored === "paper"
      ) {
        return stored;
      }
    } catch {
      /* localStorage unavailable */
    }
    return "system";
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
