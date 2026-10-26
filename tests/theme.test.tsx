import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme, type Theme } from "../src/hooks/useTheme";

beforeEach(() => {
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
    act(() => first.result.current.setTheme("light"));
    expect(second.result.current.theme).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
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
          newValue: "light",
          storageArea: localStorage,
        }),
      ),
    );
    expect(first.result.current.theme).toBe("light");
    expect(second.result.current.theme).toBe("light");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: null, storageArea: localStorage }),
      ),
    );
    expect(first.result.current.theme).toBe("dark");
    expect(second.result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
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

  it("defaults to dark for invalid preferences and rejects invalid setter values", () => {
    localStorage.setItem("portrait-edit-theme", "invalid");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
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
    expect(result.current.theme).toBe("dark");
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
        act(() => first.result.current.setTheme("light"));
        const second = renderHook(() => useTheme());
        expect(second.result.current.theme).toBe("light");
        expect(document.documentElement).toHaveAttribute("data-theme", "light");
        act(() => second.result.current.setTheme("dark"));
        expect(first.result.current.theme).toBe("dark");
      } finally {
        getItem?.mockRestore();
        setItem.mockRestore();
        act(() => first.result.current.setTheme("dark"));
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
    const { result } = renderHook(() => useTheme());
    expect(toolbarColors()).toEqual(["#101010", "#101010"]);
    for (const [theme, color] of [
      ["light", "#f7f6f2"],
      ["dark", "#101010"],
    ] as const) {
      act(() => result.current.setTheme(theme));
      expect(toolbarColors()).toEqual([color, color]);
      expect(toolbarColors()).toEqual([color, color]);
    }
  });

  it("creates a dark toolbar color by default without consulting the OS", () => {
    const { unmount } = renderHook(() => useTheme());
    expect(toolbarColors()).toEqual(["#101010"]);
    unmount();
    expect(toolbarColors()).toEqual(["#101010"]);
  });
});
