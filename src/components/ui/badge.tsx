import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-muted",
        navy: "border-transparent bg-navy text-navy-fg",
        accent: "border-transparent bg-accent-soft text-accent-ink",
        success: "border-success-border bg-success-soft text-success",
        warn: "border-warn-border bg-warn-soft text-warn",
        danger: "border-danger-border bg-danger-soft text-danger",
        gold: "border-transparent bg-gold-soft text-gold-ink",
        outline: "border-border text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
