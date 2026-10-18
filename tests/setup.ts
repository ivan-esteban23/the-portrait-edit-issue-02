import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      Object.assign(new EventTarget(), {
        matches: false,
        media: query,
        onchange: null,
      }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
