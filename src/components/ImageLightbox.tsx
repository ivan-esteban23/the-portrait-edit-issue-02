import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const lastTapTime = useRef(0);

  // Reset transform when opened or image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, src]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(z + 0.5, 4));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => {
          const next = Math.max(z - 0.5, 1);
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Double tap / double click zoom toggle
  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      if (zoom > 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setZoom(2.5);
        // Center zoom around tap point if desired or reset pan
        setPan({ x: 0, y: 0 });
      }
    },
    [zoom],
  );

  const onDoubleClick = (e: ReactMouseEvent) => {
    e.preventDefault();
    handleDoubleTap(e.clientX, e.clientY);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan, pinch-to-zoom, and double tap
  const handleTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        // Double tap detected
        handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;

      if (zoom > 1) {
        setIsDragging(true);
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        panStart.current = { ...pan };
      }
    } else if (e.touches.length === 2) {
      // Pinch started
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoom > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zooming
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = currentDist / lastTouchDistance.current;
      setZoom((z) => {
        const next = Math.max(1, Math.min(4, z * ratio));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistance.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
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
          <span className="lightbox-zoom-level">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="lightbox-controls">
          <Button
            variant="ghost"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() =>
              setZoom((z) => {
                const next = Math.max(z - 0.5, 1);
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              })
            }
          >
            −
          </Button>
          <Button
            variant="ghost"
            aria-label="Reset zoom"
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            aria-label="Zoom in"
            disabled={zoom >= 4}
            onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
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
        onClick={(event) => {
          if (event.target === event.currentTarget && zoom === 1) onClose();
        }}
        className={`lightbox-viewport ${zoom > 1 ? "is-zoomed" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        {zoom === 1
          ? "Click or tap to zoom · Double-tap for quick zoom · Drag when zoomed"
          : "Drag to pan · Double-click to reset"}
      </footer>
    </ModalContent>
  );
}
