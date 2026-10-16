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
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(text);
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
    if (!document.execCommand("copy")) throw Error("Copy unavailable");
  } finally {
    area.remove();
    active?.focus({ preventScroll: true });
    selection?.removeAllRanges();
    ranges.forEach((r) => selection?.addRange(r));
  }
}
