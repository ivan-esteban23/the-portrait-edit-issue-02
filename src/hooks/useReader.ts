import { useEffect, useState, type RefObject } from "react";
import { useSwipeGestures } from "./useSwipeGestures";
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
  const handlers = useSwipeGestures(ref, turn, enabled);
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onWheel } =
      handlers;
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchCancel, { passive: true });
    node.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
      node.removeEventListener("wheel", onWheel);
    };
  }, [ref, enabled, handlers]);
}
