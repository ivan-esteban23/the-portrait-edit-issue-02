// shadcn/ui Dialog composition with Radix focus trapping, dismissal and restoration.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="display-sheet">
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
