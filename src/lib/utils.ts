import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export function editable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'input,select,textarea,[contenteditable="true"],[role="slider"],[role="combobox"]',
      ),
    )
  );
}
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied or insecure context: fall back to execCommand below.
    }
  }

  // Fallback: use an off-screen textarea so we can select + copy.
  const active = document.activeElement as HTMLElement | null;
  const selection = window.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) =>
        selection.getRangeAt(i).cloneRange(),
      )
    : [];
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.append(area);
  try {
    area.select();
    // execCommand("copy") is deprecated but remains the only synchronous
    // clipboard fallback for older browsers and non-secure contexts.
    let copied = false;
    try {
      copied = document.execCommand?.("copy") ?? false;
    } catch {
      copied = false;
    }
    if (!copied) throw Error("Copy unavailable");
  } finally {
    area.remove();
    active?.focus({ preventScroll: true });
    selection?.removeAllRanges();
    ranges.forEach((r) => selection?.addRange(r));
  }
}

export function lightHaptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Haptics are optional, including on browsers that restrict vibration.
  }
}

/** True while a modal dialog (lightbox, settings, palette) owns the keyboard. */
export function modalOpen() {
  return Boolean(
    document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"]'),
  );
}
