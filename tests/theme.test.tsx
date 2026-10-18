import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme, type Theme } from "../src/hooks/useTheme";

let systemDark: EventTarget & { matches: boolean };

beforeEach(() => {
  systemDark = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => systemDark),
  );
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.remove());
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => vi.unstubAllGlobals());

describe("shared editorial themes", () => {
  it("keeps independently mounted controls in sync in both directions", () => {
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());
    act(() => first.result.current.setTheme("paper"));
    expect(second.result.current.theme).toBe("paper");
    expect(document.documentElement).toHaveAttribute("data-theme", "paper");
    act(() => second.result.current.setTheme("dark"));
    expect(first.result.current.theme).toBe("dark");
    expect(localStorage.getItem("portrait-edit-theme")).toBe("dark");
    const later = renderHook(() => useTheme());
    expect(later.result.current.theme).toBe("dark");
  });

  it("accepts external preference updates and resets when storage is cleared", () => {
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "portrait-edit-theme",
          newValue: "paper",
          storageArea: localStorage,
        }),
      ),
    );
    expect(first.result.current.theme).toBe("paper");
    expect(second.result.current.theme).toBe("paper");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: null, storageArea: localStorage }),
      ),
    );
    expect(first.result.current.theme).toBe("system");
    expect(second.result.current.theme).toBe("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "system");
  });

  it("ignores other storage keys and session-storage changes", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "unrelated", newValue: "dark" }),
      );
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "portrait-edit-theme",
          newValue: "dark",
          storageArea: sessionStorage,
        }),
      );
      window.dispatchEvent(
        new StorageEvent("storage", { key: null, storageArea: sessionStorage }),
      );
    });
    expect(result.current.theme).toBe("light");
  });

  it("falls back to system for invalid preferences and rejects invalid setter values", () => {
    localStorage.setItem("portrait-edit-theme", "invalid");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setTheme("invalid" as Theme));
    expect(result.current.theme).toBe("dark");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "portrait-edit-theme",
          newValue: "invalid",
        }),
      ),
    );
    expect(result.current.theme).toBe("system");
  });

  it.each(["blocked", "full"])(
    "retains a %s-storage preference across controls and route mounts",
    (reason) => {
      const first = renderHook(() => useTheme());
      const getItem =
        reason === "blocked"
          ? vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
              throw new Error("blocked");
            })
          : null;
      const setItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error(reason);
        });
      try {
        act(() => first.result.current.setTheme("paper"));
        const second = renderHook(() => useTheme());
        expect(second.result.current.theme).toBe("paper");
        expect(document.documentElement).toHaveAttribute("data-theme", "paper");
        act(() => second.result.current.setTheme("dark"));
        expect(first.result.current.theme).toBe("dark");
      } finally {
        getItem?.mockRestore();
        setItem.mockRestore();
        act(() => first.result.current.setTheme("system"));
      }
    },
  );
});

describe("browser toolbar colors", () => {
  const toolbarColors = () =>
    Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
      (meta) => meta.content,
    );

  it("updates all existing tags and keeps explicit themes independent of the OS", () => {
    for (const scheme of ["light", "dark"]) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.media = `(prefers-color-scheme: ${scheme})`;
      document.head.appendChild(meta);
    }
    systemDark.matches = true;
    const { result } = renderHook(() => useTheme());
    expect(toolbarColors()).toEqual(["#121212", "#121212"]);
    for (const [theme, color] of [
      ["light", "#f7f5f0"],
      ["paper", "#f2ece0"],
      ["dark", "#121212"],
    ] as const) {
      act(() => result.current.setTheme(theme));
      expect(toolbarColors()).toEqual([color, color]);
      act(() => {
        systemDark.matches = !systemDark.matches;
        systemDark.dispatchEvent(new Event("change"));
      });
      expect(toolbarColors()).toEqual([color, color]);
    }
  });

  it("creates a tag, follows live system changes, and cleans up its listener", () => {
    const { unmount } = renderHook(() => useTheme());
    expect(toolbarColors()).toEqual(["#f7f5f0"]);
    act(() => {
      systemDark.matches = true;
      systemDark.dispatchEvent(new Event("change"));
    });
    expect(toolbarColors()).toEqual(["#121212"]);
    act(() => {
      systemDark.matches = false;
      systemDark.dispatchEvent(new Event("change"));
    });
    expect(toolbarColors()).toEqual(["#f7f5f0"]);
    unmount();
    systemDark.matches = true;
    systemDark.dispatchEvent(new Event("change"));
    expect(toolbarColors()).toEqual(["#f7f5f0"]);
  });
});
