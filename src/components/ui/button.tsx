import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  /* Base — Apple HIG compliant: 44px touch targets, smooth transitions */
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium tracking-[-0.011em]",
    "rounded-[10px]",
    "transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Filled — teal primary */
        default: [
          "bg-primary text-primary-foreground",
          "hover:brightness-110",
          "shadow-sm",
        ].join(" "),

        /* Destructive — controlled red */
        destructive: [
          "bg-destructive/90 text-destructive-foreground",
          "hover:bg-destructive",
          "shadow-sm",
        ].join(" "),

        /* Outline — hairline border, no fill */
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-muted/60",
        ].join(" "),

        /* Secondary — filled gray */
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-muted",
        ].join(" "),

        /* Ghost — fully transparent until hover */
        ghost: [
          "bg-transparent text-foreground",
          "hover:bg-muted/70",
        ].join(" "),

        /* Link — underline affordance */
        link: "text-primary underline-offset-4 hover:underline rounded-none active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-9  px-3 text-xs rounded-[8px]",
        lg:      "h-11 px-6 py-2.5 text-base rounded-xl",
        xl:      "h-12 px-8 py-3 text-base rounded-xl",
        icon:    "h-10 w-10 rounded-[10px]",
        "icon-sm": "h-9 w-9 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
