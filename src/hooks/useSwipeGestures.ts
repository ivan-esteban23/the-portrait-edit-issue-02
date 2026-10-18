import {
  useEffect,
  useMemo,
  useRef,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { editable } from "@/lib/utils";

type Touch = TouchEvent | ReactTouchEvent<HTMLElement>;
type Wheel = WheelEvent | ReactWheelEvent<HTMLElement>;

export function useSwipeGestures(
  ref: RefObject<HTMLElement | null>,
  turn: (delta: number) => void,
  enabled: boolean,
) {
  const callback = useRef(turn);
  callback.current = turn;
  const start = useRef<{ x: number; y: number } | null>(null);
  const wheelLock = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      start.current = null;
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = null;
      wheelLock.current = false;
    };
  }, [ref, enabled]);

  return useMemo(() => {
    const selected = () => Boolean(window.getSelection()?.toString());
    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1;
    const interactive = (target: EventTarget | null) =>
      editable(target) ||
      (target instanceof Element &&
        Boolean(target.closest("button,a,summary,input,textarea")));
    const modalOpen = () =>
      Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));

    const onTouchStart = (e: Touch) => {
      start.current = null;
      if (
        !enabled ||
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
      start.current = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchMove = (e: Touch) => {
      if (!enabled || !start.current) return;
      if (e.touches.length !== 1 || selected() || zoomed() || modalOpen()) {
        start.current = null;
        return;
      }
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      const dy = Math.abs(e.touches[0].clientY - start.current.y);
      if (dy > 12 && dy >= dx) start.current = null;
    };
    const onTouchEnd = (e: Touch) => {
      const origin = start.current;
      start.current = null;
      if (
        !enabled ||
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
    const onTouchCancel = () => {
      start.current = null;
    };
    const onWheel = (e: Wheel) => {
      if (
        !enabled ||
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
    return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onWheel };
  }, [enabled]);
}
