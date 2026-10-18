import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { lightHaptic } from "@/lib/utils";
import { Button } from "./ui/button";
import { ModalContent, ModalTitle } from "./ui/dialog";

interface ImageLightboxProps {
  src: string;
  alt: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  src,
  alt,
  title,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const current = useRef(transform);
  const { zoom, pan } = transform;
  const [isDragging, setIsDragging] = useState(false);
  type Point = { x: number; y: number };
  const drag = useRef<{ point: Point; pan: Point } | null>(null);
  const pinch = useRef<{
    distance: number;
    midpoint: Point;
    zoom: number;
    pan: Point;
  } | null>(null);
  const touch = useRef<{
    point: Point;
    latest: Point;
    time: number;
    moved: boolean;
    allowTap: boolean;
    dismiss: boolean;
  } | null>(null);
  const lastTap = useRef<{ point: Point; time: number } | null>(null);
  const lastTouchTime = useRef(0);

  const bounds = useCallback(() => {
    const rect = viewport.current?.getBoundingClientRect();
    return {
      width: rect?.width || window.innerWidth,
      height: rect?.height || window.innerHeight,
      left: rect?.left || 0,
      top: rect?.top || 0,
    };
  }, []);
  const apply = useCallback(
    (requestedZoom: number, nextPan: Point, feedback = true) => {
      const nextZoom = Math.max(1, Math.min(4, requestedZoom));
      const { width, height } = bounds();
      const maxX = Math.max(0, (width * (nextZoom - 1)) / 2);
      const maxY = Math.max(0, (height * (nextZoom - 1)) / 2);
      if (
        feedback &&
        (nextZoom === 1 || nextZoom === 4) &&
        current.current.zoom !== nextZoom
      )
        lightHaptic();
      const next = {
        zoom: nextZoom,
        pan: {
          x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
          y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
        },
      };
      current.current = next;
      setTransform(next);
    },
    [bounds],
  );
  const changeZoom = useCallback(
    (nextZoom: number) => {
      const { zoom, pan } = current.current;
      const ratio = Math.max(1, Math.min(4, nextZoom)) / zoom;
      apply(nextZoom, { x: pan.x * ratio, y: pan.y * ratio });
    },
    [apply],
  );

  useEffect(() => {
    if (!isOpen) return;
    apply(1, { x: 0, y: 0 }, false);
    drag.current = pinch.current = touch.current = lastTap.current = null;
    setIsDragging(false);
  }, [isOpen, src, apply]);
  useEffect(() => {
    if (!isOpen) return;
    const resize = () =>
      apply(current.current.zoom, current.current.pan, false);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    if (viewport.current) observer?.observe(viewport.current);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, [isOpen, apply]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "0") {
        e.preventDefault();
        changeZoom(
          e.key === "0"
            ? 1
            : current.current.zoom + (e.key === "-" ? -0.5 : 0.5),
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, changeZoom]);

  const handleDoubleTap = (clientX: number, clientY: number) => {
    lightHaptic();
    if (current.current.zoom > 1) apply(1, { x: 0, y: 0 }, false);
    else {
      const rect = bounds();
      // Translate the tapped image point toward the viewport center as it grows.
      apply(
        2.5,
        {
          x: (rect.left + rect.width / 2 - clientX) * 1.5,
          y: (rect.top + rect.height / 2 - clientY) * 1.5,
        },
        false,
      );
    }
  };
  const onDoubleClick = (e: ReactMouseEvent) => {
    e.preventDefault();
    // Mobile browsers may synthesize dblclick after our touch double-tap.
    if (Date.now() - lastTouchTime.current > 500)
      handleDoubleTap(e.clientX, e.clientY);
  };
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (current.current.zoom <= 1 || e.button !== 0) return;
    e.preventDefault();
    drag.current = {
      point: { x: e.clientX, y: e.clientY },
      pan: current.current.pan,
    };
    setIsDragging(true);
  };
  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!drag.current) return;
    e.preventDefault();
    apply(current.current.zoom, {
      x: drag.current.pan.x + e.clientX - drag.current.point.x,
      y: drag.current.pan.y + e.clientY - drag.current.point.y,
    });
  };
  const handleMouseUp = () => {
    drag.current = null;
    setIsDragging(false);
  };

  const beginPinch = (touches: ReactTouchEvent["touches"]) => {
    const a = touches[0],
      b = touches[1];
    pinch.current = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      midpoint: {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      },
      ...current.current,
    };
    touch.current = null;
    lastTap.current = null;
    setIsDragging(true);
  };
  const beginTouch = (point: Point, allowTap: boolean) => {
    touch.current = {
      point,
      latest: point,
      time: Date.now(),
      moved: false,
      allowTap,
      dismiss: allowTap && current.current.zoom === 1,
    };
    drag.current = { point, pan: current.current.pan };
    setIsDragging(current.current.zoom > 1);
  };
  const handleTouchStart = (e: ReactTouchEvent) => {
    lastTouchTime.current = Date.now();
    if (e.touches.length === 2) beginPinch(e.touches);
    else if (e.touches.length === 1)
      beginTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY }, true);
    else {
      touch.current = pinch.current = drag.current = null;
      lastTap.current = null;
    }
  };
  const handleTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const a = e.touches[0],
        b = e.touches[1],
        start = pinch.current;
      if (start.distance <= 0) return;
      const nextZoom = Math.max(
        1,
        Math.min(
          4,
          (start.zoom *
            Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) /
            start.distance,
        ),
      );
      const ratio = nextZoom / start.zoom;
      const rect = bounds();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      apply(nextZoom, {
        x:
          (a.clientX + b.clientX) / 2 -
          center.x -
          (start.midpoint.x - center.x - start.pan.x) * ratio,
        y:
          (a.clientY + b.clientY) / 2 -
          center.y -
          (start.midpoint.y - center.y - start.pan.y) * ratio,
      });
    } else if (e.touches.length === 1 && touch.current && drag.current) {
      const point = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touch.current.latest = point;
      const dx = point.x - touch.current.point.x,
        dy = point.y - touch.current.point.y;
      if (Math.hypot(dx, dy) > 8) {
        touch.current.moved = true;
        lastTap.current = null;
      }
      if (current.current.zoom > 1)
        apply(current.current.zoom, {
          x: drag.current.pan.x + dx,
          y: drag.current.pan.y + dy,
        });
    }
  };
  const handleTouchEnd = (e: ReactTouchEvent) => {
    lastTouchTime.current = Date.now();
    const wasPinch = Boolean(pinch.current);
    pinch.current = null;
    if (e.touches.length === 2) {
      beginPinch(e.touches);
      return;
    }
    if (e.touches.length === 1) {
      beginTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY }, false);
      return;
    }
    const gesture = touch.current;
    if (gesture && !wasPinch) {
      const end = e.changedTouches[0];
      const point = end ? { x: end.clientX, y: end.clientY } : gesture.latest;
      const dx = point.x - gesture.point.x,
        dy = point.y - gesture.point.y;
      if (
        gesture.dismiss &&
        current.current.zoom === 1 &&
        dy > 70 &&
        dy > Math.abs(dx)
      )
        onClose();
      else if (
        gesture.allowTap &&
        !gesture.moved &&
        Math.hypot(dx, dy) <= 8 &&
        Date.now() - gesture.time < 300
      ) {
        const previous = lastTap.current;
        if (
          previous &&
          Date.now() - previous.time < 300 &&
          Math.hypot(point.x - previous.point.x, point.y - previous.point.y) <
            40
        ) {
          handleDoubleTap(point.x, point.y);
          lastTap.current = null;
        } else lastTap.current = { point, time: Date.now() };
      }
    }
    touch.current = drag.current = null;
    setIsDragging(false);
  };
  const handleTouchCancel = () => {
    touch.current = pinch.current = drag.current = lastTap.current = null;
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <ModalContent
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="lightbox-overlay"
      className="lightbox-content"
      initialFocus={closeButton}
    >
      <header className="lightbox-toolbar">
        <div className="lightbox-info">
          <ModalTitle asChild>
            <h2 className="lightbox-title">
              {title || "Image detail inspector"}
            </h2>
          </ModalTitle>
          <span
            className="lightbox-zoom-level"
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div className="lightbox-controls">
          <Button
            variant="ghost"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => changeZoom(current.current.zoom - 0.5)}
          >
            −
          </Button>
          <Button
            variant="ghost"
            aria-label="Reset zoom"
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            onClick={() => changeZoom(1)}
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            aria-label="Zoom in"
            disabled={zoom >= 4}
            onClick={() => changeZoom(current.current.zoom + 0.5)}
          >
            +
          </Button>
          <Button
            variant="ghost"
            ref={closeButton}
            className="lightbox-close"
            aria-label="Close image lightbox"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>
      </header>

      <div
        ref={viewport}
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            zoom === 1 &&
            Date.now() - lastTouchTime.current > 500
          )
            onClose();
        }}
        className={`lightbox-viewport ${zoom > 1 ? "is-zoomed" : ""} ${isDragging ? "is-dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onDoubleClick={onDoubleClick}
      >
        <img
          src={src}
          alt={alt}
          className="lightbox-image"
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>

      <footer className="lightbox-hint">
        Double-tap or double-click to zoom · Drag to pan · Swipe down to close
        at 100%
      </footer>
    </ModalContent>
  );
}
