// shadcn/ui Dialog composition with Radix focus trapping, dismissal and restoration.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  useRef,
  type ReactNode,
  type RefObject,
  type KeyboardEventHandler,
} from "react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="display-sheet" aria-modal="true">
        <div className="sheet-heading">
          <DialogPrimitive.Title>Display & navigation</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="quiet-control"
            aria-label="Close display settings"
          >
            Close ×
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Description>
          Choose how you read this issue.
        </DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// Controlled overlays have external triggers, so Radix's Trigger ref is absent.
// Capture the opener before autofocus and restore it for every dismissal path.
export function ModalContent({
  isOpen,
  onClose,
  overlayClassName,
  className,
  initialFocus,
  children,
  onKeyDown,
}: {
  isOpen: boolean;
  onClose: () => void;
  overlayClassName: string;
  className: string;
  initialFocus: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={overlayClassName}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <DialogPrimitive.Content
            className={className}
            aria-modal="true"
            aria-describedby={undefined}
            onKeyDown={onKeyDown}
            onOpenAutoFocus={(event) => {
              opener.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
              event.preventDefault();
              initialFocus.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = opener.current?.isConnected
                ? opener.current
                : document.getElementById("main");
              target?.focus({ preventScroll: true });
            }}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export const ModalTitle = DialogPrimitive.Title;
