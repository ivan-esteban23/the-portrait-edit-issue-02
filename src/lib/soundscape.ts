const STORAGE_KEY = "portrait-edit-focus-soundscape";
const CHANGE_EVENT = "portrait-edit-soundscape-change";
type SoundscapePreference = { enabled: boolean; volume: number };

let context: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;

function readPreference(): SoundscapePreference {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (value && typeof value === "object") {
      return {
        enabled: value.enabled === true,
        volume: Math.max(0, Math.min(1, Number(value.volume) || 0)),
      };
    }
  } catch {
    /* storage may be unavailable */
  }
  return { enabled: false, volume: 0.22 };
}

function savePreference(next: SoundscapePreference) {
  const normalized = {
    enabled: next.enabled,
    volume: Math.max(0, Math.min(1, next.volume)),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: normalized }));
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  context ??= new Ctx();
  return context;
}

/** Start a quiet, looping synthetic room tone. Call in direct response to a user gesture. */
export async function startFocusSoundscape(volume: number): Promise<void> {
  const ctx = audioContext();
  if (!ctx) return;
  stopNodes();
  const normalized = Math.max(0, Math.min(1, volume));
  savePreference({ enabled: true, volume: normalized });
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const length = Math.floor(ctx.sampleRate * 6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      const crackle =
        Math.random() > 0.9992 ? (Math.random() * 2 - 1) * 0.12 : 0;
      samples[i] = brown * 3.5 + crackle;
    }
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.65;
    gain = ctx.createGain();
    gain.gain.setTargetAtTime(normalized * 0.16, ctx.currentTime, 0.25);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    stopNodes();
    savePreference({ enabled: false, volume: normalized });
  }
}

function stopNodes() {
  if (source) {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source.disconnect();
    source = null;
  }
  gain?.disconnect();
  gain = null;
}

export function stopFocusSoundscape(): void {
  stopNodes();
  const preference = readPreference();
  savePreference({ ...preference, enabled: false });
}

export function setSoundscapeVolume(volume: number): void {
  const normalized = Math.max(0, Math.min(1, volume));
  const preference = readPreference();
  gain?.gain.setTargetAtTime(
    normalized * 0.16,
    context?.currentTime ?? 0,
    0.08,
  );
  savePreference({ ...preference, volume: normalized });
}

export function getSoundscapePreference(): SoundscapePreference {
  return readPreference();
}

export const SOUNDSCAPE_CHANGE_EVENT = CHANGE_EVENT;
