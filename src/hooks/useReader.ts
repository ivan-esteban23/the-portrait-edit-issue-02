import { useEffect, useRef, useState, type RefObject } from "react";
import { editable } from "@/lib/utils";
export function useMedia(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
export function useIdleChrome(enabled: boolean) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3500);
    };
    const events = [
      "pointermove",
      "pointerdown",
      "keydown",
      "touchstart",
      "focusin",
    ] as const;
    events.forEach((name) =>
      window.addEventListener(name, wake, { passive: true }),
    );
    wake();
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, [enabled]);
  return idle;
}
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  turn: (delta: number) => void,
  enabled: boolean,
) {
  const callback = useRef(turn);
  callback.current = turn;
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    let start: { x: number; y: number } | null = null;
    const selected = () => Boolean(window.getSelection()?.toString());
    const begin = (e: TouchEvent) => {
      start = null;
      if (
        e.touches.length !== 1 ||
        selected() ||
        editable(e.target) ||
        (window.visualViewport?.scale ?? 1) > 1 ||
        (e.target instanceof Element && e.target.closest("button,a,summary"))
      )
        return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1 || selected()) {
        start = null;
        return;
      }
      const dx = Math.abs(e.touches[0].clientX - start.x),
        dy = Math.abs(e.touches[0].clientY - start.y);
      if (dy > 12 && dy >= dx) start = null;
    };
    const end = (e: TouchEvent) => {
      const origin = start;
      start = null;
      if (
        !origin ||
        e.touches.length ||
        e.changedTouches.length !== 1 ||
        selected()
      )
        return;
      const dx = e.changedTouches[0].clientX - origin.x,
        dy = e.changedTouches[0].clientY - origin.y;
      if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.5)
        callback.current(dx < 0 ? 1 : -1);
    };
    const cancel = () => {
      start = null;
    };
    node.addEventListener("touchstart", begin, { passive: true });
    node.addEventListener("touchmove", move, { passive: true });
    node.addEventListener("touchend", end, { passive: true });
    node.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      node.removeEventListener("touchstart", begin);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", cancel);
    };
  }, [ref, enabled]);
}
