import { useCallback, useEffect, useState } from "react";

const SOUND_STORAGE_KEY = "portrait-edit-sound";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    /* private browsing / localStorage unavailable */
  }
}

/**
 * Synthesizes a soft, organic paper-turn noise using Web Audio API:
 * Filtered pink/brown noise burst with a low-pass filter and smooth gain envelope (~80ms).
 * Completely self-contained, no external audio files required.
 */
export function playPaperTurnSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // ~80ms duration
    const duration = 0.08;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Filtered noise with paper-like texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Low-pass filter simulating friction of heavy matte magazine paper
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);

    // Subtle gain envelope: gentle 8ms attack and smooth exponential decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch {
    /* Silent fail if Web Audio not supported or blocked */
  }
}

export function playPaperTurnSoundIfEnabled(): void {
  if (isSoundEnabled()) {
    playPaperTurnSound();
  }
}

export function useSoundEffect() {
  const [soundEnabled, setSoundState] = useState<boolean>(() => isSoundEnabled());

  const toggleSound = useCallback(() => {
    setSoundState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      if (next) {
        // Play once when enabled for instant feedback
        playPaperTurnSound();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SOUND_STORAGE_KEY && e.newValue !== null) {
        setSoundState(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    soundEnabled,
    toggleSound,
    playPaperTurn: playPaperTurnSoundIfEnabled,
  };
}
