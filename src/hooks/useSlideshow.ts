import { useCallback, useEffect, useRef, useState } from "react";

interface SlideshowOptions {
  page: number;
  pageCount: number;
  getCurrentPage: () => number;
  onPageSelect: (page: number) => void;
  onAdvance: (delta: number) => void;
  onEnd: () => void;
  paused: boolean;
}

// Slideshow (presentation mode) state and automatic page advancement.
export function useSlideshow(options: SlideshowOptions) {
  const { page, pageCount, paused } = options;
  const latest = useRef(options);
  latest.current = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideshowSpeed, setSlideshowSpeed] = useState(6000);
  const [loopSlideshow, setLoopSlideshow] = useState(false);
  const [slideshowProgress, setSlideshowProgress] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const progress = useRef(0);
  const toggleSlideshow = useCallback(
    () => setIsPlaying((playing) => !playing),
    [],
  );
  const isEffectivelyPlaying = isPlaying && !isHoverPaused && !paused;

  useEffect(() => {
    progress.current = 0;
    setSlideshowProgress(0);
  }, [page]);

  useEffect(() => {
    if (!isEffectivelyPlaying) return;
    const stepMs = 50;
    const timer = setInterval(() => {
      const next = progress.current + (stepMs / slideshowSpeed) * 100;
      progress.current = next >= 100 ? 0 : next;
      setSlideshowProgress(progress.current);
      if (next < 100) return;
      const { getCurrentPage, onPageSelect, onAdvance, onEnd } = latest.current;
      if (getCurrentPage() >= pageCount) {
        if (loopSlideshow) onPageSelect(1);
        else {
          setIsPlaying(false);
          onEnd();
        }
      } else onAdvance(1);
    }, stepMs);
    return () => clearInterval(timer);
  }, [isEffectivelyPlaying, slideshowSpeed, loopSlideshow, page, pageCount]);

  return {
    isPlaying,
    toggleSlideshow,
    slideshowSpeed,
    setSlideshowSpeed,
    loopSlideshow,
    setLoopSlideshow,
    slideshowProgress,
    isHoverPaused,
    setIsHoverPaused,
  };
}
