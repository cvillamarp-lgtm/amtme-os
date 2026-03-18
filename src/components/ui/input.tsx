import * as React from "react";
import { cn } from "@/lib/utils";

/* Apple-style input — filled background, no visible border until focus */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Size — 40px height (Apple HIG minimum) */
          "flex h-10 w-full",
          /* Radius — 10px (Apple standard) */
          "rounded-[10px]",
          /* Fill — muted bg, no border in rest state */
          "bg-muted/70 border border-transparent",
          /* Text */
          "px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/60",
          "tracking-[-0.011em]",
          /* Focus — thin ring, bg brightens */
          "focus-visible:outline-none",
          "focus-visible:bg-card",
          "focus-visible:border-border",
          "focus-visible:ring-2 focus-visible:ring-ring/30",
          /* File input */
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          /* States */
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
