import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assetUrl } from "@/content";

interface ThumbnailFilmstripProps {
  pages: readonly number[];
  currentPageIndex: number;
  pageDirectory: string;
  onPageSelect: (page: number) => void;
}

const BUFFER = 3;

export function ThumbnailFilmstrip({
  pages,
  currentPageIndex,
  pageDirectory,
  onPageSelect,
}: ThumbnailFilmstripProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ width: 64, gap: 10 });
  const [viewport, setViewport] = useState({ left: 0, width: 0 });
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [keyboardTarget, setKeyboardTarget] = useState<number | null>(null);
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(pages.length, BUFFER + 1),
  });

  useLayoutEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const measure = () => {
      const thumb = node.querySelector<HTMLButtonElement>(
        ".filmstrip-thumb-btn",
      );
      const width = thumb?.getBoundingClientRect().width || 64;
      const gap = parseFloat(getComputedStyle(node).columnGap) || 10;
      setMetrics((previous) =>
        previous.width === width && previous.gap === gap
          ? previous
          : { width, gap },
      );
      setViewport({ left: node.scrollLeft, width: node.clientWidth });
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    // Center after Reader's page-change scroll reset, without waiting for the image to mount.
    const frame = requestAnimationFrame(() => {
      const slot = scroll.current?.children[currentPageIndex];
      slot?.scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPageIndex, pages.length]);

  useLayoutEffect(() => {
    const stride = metrics.width + metrics.gap;
    const start = Math.max(0, Math.floor(viewport.left / stride) - BUFFER);
    const end = Math.min(
      pages.length,
      Math.ceil((viewport.left + viewport.width) / stride) + BUFFER,
    );
    setRange((previous) =>
      previous.start === start && previous.end === end
        ? previous
        : { start, end },
    );
  }, [pages.length, metrics, viewport]);

  useLayoutEffect(() => {
    if (keyboardTarget === null) return;
    const button =
      scroll.current?.children[
        keyboardTarget
      ]?.querySelector<HTMLButtonElement>("button");
    if (button) {
      button.focus();
      setKeyboardTarget(null);
    }
  }, [keyboardTarget]);

  return (
    <div
      className="thumbnails-filmstrip-drawer"
      role="region"
      aria-label="Thumbnails filmstrip"
    >
      <div
        ref={scroll}
        className="filmstrip-scroll"
        onScroll={(event) => {
          setViewport({
            left: event.currentTarget.scrollLeft,
            width: event.currentTarget.clientWidth,
          });
        }}
      >
        {pages.map((pNum, index) => {
          // Keep the focused control mounted if the user scrolls it out of view.
          const visible =
            (index >= range.start && index < range.end) ||
            focusedPage === pNum ||
            keyboardTarget === index;
          return (
            // Stable slots preserve native scroll-snap targets as thumbnails mount and unmount.
            <div
              key={pNum}
              aria-hidden={visible ? undefined : true}
              style={{
                flex: `0 0 ${metrics.width}px`,
                scrollSnapAlign: "center",
              }}
            >
              {visible && (
                <button
                  type="button"
                  className={`filmstrip-thumb-btn ${index === currentPageIndex ? "is-active" : ""}`}
                  style={{ scrollSnapAlign: "none" }}
                  aria-label={`Jump to page ${pNum}`}
                  aria-current={index === currentPageIndex ? "page" : undefined}
                  onFocus={() => setFocusedPage(pNum)}
                  onBlur={() => setFocusedPage(null)}
                  onKeyDown={(event) => {
                    if (
                      event.key !== "Tab" ||
                      event.defaultPrevented ||
                      event.altKey ||
                      event.ctrlKey ||
                      event.metaKey
                    )
                      return;
                    const next = index + (event.shiftKey ? -1 : 1);
                    if (next < 0 || next >= pages.length) return;
                    // Mount the next control before focusing it, even when Tab outruns scrolling.
                    event.preventDefault();
                    setKeyboardTarget(next);
                  }}
                  onClick={() => onPageSelect(pNum)}
                >
                  <img
                    src={assetUrl(
                      `${pageDirectory}/${String(pNum).padStart(3, "0")}.webp`,
                    )}
                    alt={`Page ${pNum}`}
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={72}
                  />
                  <span className="filmstrip-thumb-number">{pNum}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
