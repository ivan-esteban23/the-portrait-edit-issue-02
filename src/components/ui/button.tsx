// shadcn/ui Button pattern, styled for this publication (Radix Slot + CVA).
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "button-primary bg-foreground text-background hover:opacity-85",
        outline: "border border-border bg-surface hover:bg-hover",
        ghost: "text-muted hover:bg-hover hover:text-foreground",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, className }))} {...props} />
  );
}
