import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSwipe } from "../src/hooks/useReader";

function touch(
  target: HTMLElement,
  type: string,
  points: { clientX: number; clientY: number }[],
  changed = points,
) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    touches: { value: points },
    changedTouches: { value: changed },
  });
  act(() => target.dispatchEvent(event));
}
function swipe(node: HTMLElement, dx = -60, dy = 0, x = 180) {
  touch(node, "touchstart", [{ clientX: x, clientY: 100 }]);
  touch(node, "touchend", [], [{ clientX: x + dx, clientY: 100 + dy }]);
}
function wheel(node: HTMLElement, deltaX = 40, options: WheelEventInit = {}) {
  act(() =>
    node.dispatchEvent(
      new WheelEvent("wheel", { bubbles: true, deltaX, ...options }),
    ),
  );
}
function setup() {
  const node = document.createElement("div");
  const turn = vi.fn();
  const ref = { current: node };
  const hook = renderHook(
    ({ enabled, callback }) => useSwipe(ref, callback, enabled),
    {
      initialProps: { enabled: true, callback: turn },
    },
  );
  return { node, turn, ...hook };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("innerWidth", 360);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reader touch gestures", () => {
  it.each([0, 23, 337, 359])(
    "leaves swipes starting at x=%s to OS edge navigation",
    (x) => {
      const { node, turn } = setup();
      swipe(node, x < 180 ? 100 : -100, 0, x);
      expect(turn).not.toHaveBeenCalled();
    },
  );
  it.each([24, 336])("accepts the exact 24px edge boundary at x=%s", (x) => {
    const { node, turn } = setup();
    swipe(node, x < 180 ? 60 : -60, 0, x);
    expect(turn).toHaveBeenCalledWith(x < 180 ? -1 : 1);
  });
  it("requires 60px and a horizontal-to-vertical ratio greater than 1.5", () => {
    const { node, turn } = setup();
    swipe(node, -59);
    swipe(node, -60, 40);
    expect(turn).not.toHaveBeenCalled();
    swipe(node, -60, 39);
    swipe(node, 60);
    expect(turn.mock.calls).toEqual([[1], [-1]]);
  });
  it("locks out a vertical gesture even if its final displacement is horizontal", () => {
    const { node, turn } = setup();
    touch(node, "touchstart", [{ clientX: 180, clientY: 100 }]);
    touch(node, "touchmove", [{ clientX: 185, clientY: 130 }]);
    touch(node, "touchend", [], [{ clientX: 80, clientY: 100 }]);
    expect(turn).not.toHaveBeenCalled();
  });
  it("cancels multiple touches, pinch zoom, and touchcancel", () => {
    const { node, turn } = setup();
    const point = { clientX: 180, clientY: 100 };
    touch(node, "touchstart", [point, point]);
    touch(node, "touchend", [], [{ clientX: 80, clientY: 100 }]);
    touch(node, "touchstart", [point]);
    touch(node, "touchmove", [point, point]);
    touch(node, "touchend", [], [{ clientX: 80, clientY: 100 }]);
    touch(node, "touchstart", [point]);
    touch(node, "touchcancel", []);
    touch(node, "touchend", [], [{ clientX: 80, clientY: 100 }]);
    vi.stubGlobal("visualViewport", { scale: 2 });
    swipe(node);
    vi.stubGlobal("visualViewport", { scale: 1 });
    touch(node, "touchstart", [point]);
    vi.stubGlobal("visualViewport", { scale: 2 });
    touch(node, "touchend", [], [{ clientX: 80, clientY: 100 }]);
    expect(turn).not.toHaveBeenCalled();
  });
  it("preserves text selection and interactive controls", () => {
    const { node, turn } = setup();
    for (const tag of [
      "button",
      "a",
      "summary",
      "input",
      "textarea",
      "select",
    ]) {
      const control = document.createElement(tag);
      node.append(control);
      swipe(control);
      wheel(control);
    }
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "selected text",
    } as Selection);
    swipe(node);
    wheel(node);
    expect(turn).not.toHaveBeenCalled();
  });
});

describe("reader trackpad gestures", () => {
  it("turns once per 400ms lock, using the latest callback", () => {
    const { node, turn, rerender } = setup();
    wheel(node, 35);
    wheel(node, 80);
    act(() => vi.advanceTimersByTime(399));
    wheel(node, 40);
    expect(turn.mock.calls).toEqual([[1]]);
    const latest = vi.fn();
    rerender({ enabled: true, callback: latest });
    act(() => vi.advanceTimersByTime(1));
    wheel(node, -40);
    expect(latest).toHaveBeenCalledWith(-1);
  });
  it("ignores vertical scrolling, small deltas, native zoom, and zoomed pages", () => {
    const { node, turn } = setup();
    wheel(node, 34);
    wheel(node, 40, { deltaY: 40 });
    wheel(node, 40, { deltaY: 100 });
    wheel(node, 40, { ctrlKey: true });
    wheel(node, 40, { metaKey: true });
    vi.stubGlobal("visualViewport", { scale: 2 });
    wheel(node);
    expect(turn).not.toHaveBeenCalled();
  });
  it("clears the lock and listeners when disabled or unmounted", () => {
    const { node, turn, rerender, unmount } = setup();
    wheel(node);
    rerender({ enabled: false, callback: turn });
    expect(vi.getTimerCount()).toBe(0);
    wheel(node);
    swipe(node);
    expect(turn).toHaveBeenCalledTimes(1);
    rerender({ enabled: true, callback: turn });
    wheel(node);
    expect(turn).toHaveBeenCalledTimes(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    wheel(node);
    expect(turn).toHaveBeenCalledTimes(2);
  });
});
