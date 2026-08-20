import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-[opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90",
        secondary: "border border-border bg-elevated text-fg hover:bg-surface",
        ghost: "text-fg hover:bg-elevated/80",
        choice: "border border-border bg-surface text-left text-fg hover:border-accent hover:bg-elevated",
      },
      size: {
        sm: "h-9 rounded-[length:var(--radius-sm)] px-3 text-sm",
        md: "h-11 rounded-[length:var(--radius-md)] px-5 text-sm",
        lg: "h-12 rounded-[length:var(--radius-lg)] px-6 text-base",
        choice: "min-h-12 rounded-[length:var(--radius-md)] px-4 py-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
