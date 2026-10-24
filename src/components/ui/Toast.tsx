import { useLayoutEffect, useRef } from "react";

interface ToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export function Toast({ message, onUndo, onDismiss, visible }: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const restoreFocus = () => {
    if (!toastRef.current?.contains(document.activeElement)) return;
    const opener = openerRef.current;
    const target = opener?.isConnected
      ? opener
      : document.getElementById("main");
    target?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!visible) return;
    const toast = toastRef.current;
    const opener =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    openerRef.current = opener;
    const timeout = window.setTimeout(() => {
      restoreFocus();
      onDismiss();
    }, 4000);
    return () => {
      window.clearTimeout(timeout);
      if (toast?.contains(document.activeElement)) {
        const target = opener?.isConnected
          ? opener
          : document.getElementById("main");
        target?.focus({ preventScroll: true });
      }
    };
  }, [message, onDismiss, visible]);

  if (!visible) return null;

  return (
    <div
      ref={toastRef}
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 translate-y-0 items-center gap-4 rounded-lg bg-neutral-900 px-4 py-3 text-white opacity-100 shadow-lg transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        className="pointer-events-auto font-medium underline underline-offset-2 hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          restoreFocus();
          onUndo();
        }}
      >
        Undo
      </button>
    </div>
  );
}
