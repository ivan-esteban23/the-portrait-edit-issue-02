import { useEffect } from "react";
import { Button } from "./ui/button";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: "→ / J", label: "Next page" },
    { key: "← / K", label: "Previous page" },
    { key: "Home / End", label: "First / Last page" },
    { key: "F", label: "Toggle Focus Mode" },
    { key: "T", label: "Toggle Reading View / Original Page" },
    { key: "S", label: "Toggle Two-Page Spread (Desktop)" },
    { key: "M", label: "Cycle Theme (Light / Warm Paper / Dark)" },
    { key: "?", label: "Open / Close this cheatsheet" },
    { key: "Esc", label: "Close overlays / Exit Focus Mode" },
  ];

  return (
    <div
      className="shortcuts-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts cheatsheet"
      onClick={onClose}
    >
      <div
        className="shortcuts-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-modal-header">
          <div>
            <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
            <p className="shortcuts-modal-sub">
              Editorial hotkeys to navigate and view The Portrait Edit.
            </p>
          </div>
          <Button
            variant="ghost"
            className="shortcuts-close-btn"
            onClick={onClose}
            aria-label="Close shortcuts cheatsheet"
          >
            Close ✕
          </Button>
        </div>

        <div className="shortcuts-grid">
          {shortcuts.map((s) => (
            <div key={s.key} className="shortcut-row">
              <kbd className="shortcut-kbd">{s.key}</kbd>
              <span className="shortcut-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="shortcuts-modal-footer">
          <span>Press <kbd className="shortcut-kbd-inline">?</kbd> anytime to toggle</span>
        </div>
      </div>
    </div>
  );
}
