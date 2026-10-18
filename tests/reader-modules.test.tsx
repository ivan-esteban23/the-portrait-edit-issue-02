import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSlideshow } from "../src/hooks/useSlideshow";
import { ThumbnailFilmstrip } from "../src/components/reader/ThumbnailFilmstrip";

const options = () => ({
  page: 1,
  pageCount: 186,
  getCurrentPage: () => 1,
  onPageSelect: vi.fn(),
  onAdvance: vi.fn(),
  onEnd: vi.fn(),
  paused: false,
});

afterEach(() => vi.useRealTimers());

describe("extracted reader slideshow", () => {
  it("advances once per interval under StrictMode and resets progress on a page turn", () => {
    vi.useFakeTimers();
    const initial = options();
    const { result, rerender, unmount } = renderHook(useSlideshow, {
      initialProps: initial,
      wrapper: StrictMode,
    });
    expect(result.current.slideshowSpeed).toBe(6000);
    act(() => result.current.toggleSlideshow());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.slideshowProgress).toBeCloseTo(50);
    expect(initial.onAdvance).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(3050));
    expect(initial.onAdvance.mock.calls).toEqual([[1]]);
    rerender({ ...initial, page: 2, getCurrentPage: () => 2 });
    expect(result.current.slideshowProgress).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses for overlays and hover, resumes accumulated progress, and uses the latest callback", () => {
    vi.useFakeTimers();
    const initial = options();
    const { result, rerender } = renderHook(useSlideshow, {
      initialProps: initial,
    });
    act(() => {
      result.current.setSlideshowSpeed(4000);
      result.current.toggleSlideshow();
    });
    act(() => vi.advanceTimersByTime(2000));
    const halfway = result.current.slideshowProgress;
    rerender({ ...initial, paused: true });
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.slideshowProgress).toBe(halfway);
    act(() => result.current.setIsHoverPaused(true));
    const latest = vi.fn();
    rerender({ ...initial, onAdvance: latest });
    act(() => vi.advanceTimersByTime(10000));
    expect(latest).not.toHaveBeenCalled();
    act(() => result.current.setIsHoverPaused(false));
    act(() => vi.advanceTimersByTime(2000));
    expect(latest.mock.calls).toEqual([[1]]);
    expect(initial.onAdvance).not.toHaveBeenCalled();
  });

  it("stops and announces the final page, or loops back to the cover when enabled", () => {
    vi.useFakeTimers();
    const initial = { ...options(), page: 186, getCurrentPage: () => 186 };
    const { result } = renderHook(useSlideshow, { initialProps: initial });
    act(() => {
      result.current.setSlideshowSpeed(4000);
      result.current.toggleSlideshow();
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.isPlaying).toBe(false);
    expect(initial.onEnd).toHaveBeenCalledOnce();
    expect(initial.onAdvance).not.toHaveBeenCalled();
    act(() => {
      result.current.setLoopSlideshow(true);
      result.current.toggleSlideshow();
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(initial.onPageSelect).toHaveBeenCalledWith(1);
    expect(result.current.isPlaying).toBe(true);
    expect(initial.onEnd).toHaveBeenCalledOnce();
  });
});

it("virtualizes filmstrip images with a three-item buffer and updates after scrolling and resizing", () => {
  let viewportWidth = 300;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    () => viewportWidth,
  );
  const pages = Array.from({ length: 186 }, (_, index) => index + 1);
  const onPageSelect = vi.fn();
  const { container } = render(
    <ThumbnailFilmstrip
      pages={pages}
      currentPageIndex={0}
      pageDirectory="pages"
      onPageSelect={onPageSelect}
    />,
  );
  const strip = container.querySelector<HTMLDivElement>(".filmstrip-scroll")!;
  expect(
    screen.getByRole("button", { name: "Jump to page 1" }),
  ).toHaveAttribute("aria-current", "page");
  expect(container.querySelectorAll("img").length).toBeLessThan(15);
  expect(
    screen.queryByRole("button", { name: "Jump to page 100" }),
  ).not.toBeInTheDocument();
  const first = screen.getByRole("button", { name: "Jump to page 1" });
  act(() => first.focus());
  strip.scrollLeft = 74 * 50;
  fireEvent.scroll(strip);
  expect(first).toHaveFocus();
  act(() => first.blur());
  expect(first).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Jump to page 48" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Jump to page 47" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Jump to page 58" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Jump to page 59" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Jump to page 52" }));
  expect(onPageSelect).toHaveBeenCalledWith(52);
  viewportWidth = 600;
  fireEvent(window, new Event("resize"));
  expect(
    screen.getByRole("button", { name: "Jump to page 62" }),
  ).toBeInTheDocument();
  expect(container.querySelectorAll("img").length).toBeLessThan(20);
});

it("keeps rapid Tab and Shift+Tab traversal inside the virtualized sequence and releases focus at its edges", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  const pages = Array.from({ length: 20 }, (_, index) => index + 1);
  render(
    <ThumbnailFilmstrip
      pages={pages}
      currentPageIndex={0}
      pageDirectory="pages"
      onPageSelect={vi.fn()}
    />,
  );
  const first = screen.getByRole("button", { name: "Jump to page 1" });
  act(() => first.focus());
  expect(fireEvent.keyDown(first, { key: "Tab", shiftKey: true })).toBe(true);
  for (let index = 1; index < 20; index++) {
    const focused = document.activeElement!;
    expect(fireEvent.keyDown(focused, { key: "Tab" })).toBe(false);
    expect(
      screen.getByRole("button", { name: `Jump to page ${index + 1}` }),
    ).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Jump to page 10" }),
    ).toBeInTheDocument();
  }
  expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
  for (let index = 19; index > 0; index--) {
    expect(
      fireEvent.keyDown(document.activeElement!, {
        key: "Tab",
        shiftKey: true,
      }),
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: `Jump to page ${index}` }),
    ).toHaveFocus();
  }
});
