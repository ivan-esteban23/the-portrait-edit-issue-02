import { useEffect } from "react";

interface ToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export function Toast({ message, onUndo, onDismiss, visible }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss, visible]);

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-4 rounded-lg bg-neutral-900 px-4 py-3 text-white shadow-lg transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span>{message}</span>
      <button
        type="button"
        className="pointer-events-auto font-medium underline underline-offset-2 hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUndo();
        }}
      >
        Undo
      </button>
    </div>
  );
}
