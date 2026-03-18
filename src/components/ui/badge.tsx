import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Apple-style badges — pill shape, light fills, no border */
const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full",
    "px-2 py-0.5",
    "text-xs font-medium tracking-[-0.011em]",
    "transition-colors duration-150",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "bg-primary/15 text-primary border-transparent",
        secondary:   "bg-muted text-muted-foreground border-transparent",
        destructive: "bg-destructive/12 text-destructive border-transparent",
        outline:     "border border-border/70 text-foreground bg-transparent",
        success:     "bg-success/12 text-success border-transparent",
        warning:     "bg-warning/15 text-warning border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
