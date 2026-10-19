import { useRef } from "react";
import { Button } from "./ui/button";
import { ModalContent, ModalTitle } from "./ui/dialog";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  const shortcuts = [
    { key: "⌘K / Ctrl+K", label: "Open Command Palette & Search" },
    { key: "→ / J", label: "Next page" },
    { key: "← / K", label: "Previous page" },
    { key: "Home / End", label: "First / Last page" },
    { key: "P", label: "Play / Pause presentation slideshow" },
    { key: "F", label: "Toggle fullscreen reading" },
    { key: "T", label: "Open Table of Contents" },
    { key: "R", label: "Toggle Reading View / Original Page" },
    { key: "S", label: "Toggle Two-Page Spread (Desktop)" },
    { key: "B", label: "Bookmark / save current study" },
    { key: "M", label: "Cycle Theme (Light / Warm Paper / Dark)" },
    { key: "?", label: "Open / Close this cheatsheet" },
    { key: "Esc", label: "Close overlays / Exit Focus Mode" },
  ];

  return (
    <ModalContent
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="shortcuts-modal-overlay"
      className="shortcuts-modal-card"
      initialFocus={closeButton}
      onKeyDown={(event) => {
        if (event.key === "?") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="shortcuts-modal-header">
        <div>
          <ModalTitle asChild>
            <h2>Keyboard Shortcuts</h2>
          </ModalTitle>
          <p className="shortcuts-modal-sub">
            Editorial hotkeys to navigate and view The Portrait Edit.
          </p>
        </div>
        <Button
          ref={closeButton}
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
        <span>
          Press <kbd className="shortcut-kbd-inline">?</kbd> anytime to toggle
        </span>
      </div>
    </ModalContent>
  );
}
