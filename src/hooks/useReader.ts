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
  const wheelLock = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    let start: { x: number; y: number } | null = null;
    const selected = () => Boolean(window.getSelection()?.toString());
    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1;
    const interactive = (target: EventTarget | null) =>
      editable(target) ||
      (target instanceof Element &&
        Boolean(target.closest("button,a,summary,input,textarea")));
    const modalOpen = () =>
      Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));

    const begin = (e: TouchEvent) => {
      start = null;
      if (
        e.touches.length !== 1 ||
        selected() ||
        interactive(e.target) ||
        zoomed() ||
        modalOpen()
      )
        return;

      const touch = e.touches[0];
      // Leave OS edge navigation to Android/iOS instead of also turning a page.
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      start = { x: touch.clientX, y: touch.clientY };
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1 || selected() || zoomed() || modalOpen()) {
        start = null;
        return;
      }
      const dx = Math.abs(e.touches[0].clientX - start.x);
      const dy = Math.abs(e.touches[0].clientY - start.y);
      if (dy > 12 && dy >= dx) start = null;
    };
    const end = (e: TouchEvent) => {
      const origin = start;
      start = null;
      if (
        !origin ||
        e.touches.length ||
        e.changedTouches.length !== 1 ||
        selected() ||
        zoomed() ||
        modalOpen()
      )
        return;

      const dx = e.changedTouches[0].clientX - origin.x;
      const dy = e.changedTouches[0].clientY - origin.y;
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        callback.current(dx < 0 ? 1 : -1);
      }
    };
    const cancel = () => {
      start = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        zoomed() ||
        selected() ||
        interactive(e.target) ||
        modalOpen() ||
        Math.abs(e.deltaX) < 35 ||
        Math.abs(e.deltaX) <= Math.abs(e.deltaY)
      )
        return;
      if (wheelLock.current) return;

      wheelLock.current = true;
      callback.current(e.deltaX > 0 ? 1 : -1);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        wheelLock.current = false;
        wheelTimer.current = null;
      }, 400);
    };

    node.addEventListener("touchstart", begin, { passive: true });
    node.addEventListener("touchmove", move, { passive: true });
    node.addEventListener("touchend", end, { passive: true });
    node.addEventListener("touchcancel", cancel, { passive: true });
    node.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      node.removeEventListener("touchstart", begin);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", cancel);
      node.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = null;
      wheelLock.current = false;
    };
  }, [ref, enabled]);
}
