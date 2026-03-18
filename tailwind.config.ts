import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      /* ── SF Pro via system-ui (Apple devices auto-resolve to SF Pro) ── */
      fontFamily: {
        sans:    ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"SF Pro Display"', "system-ui", '"Helvetica Neue"', "Arial", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"SF Pro Text"', "system-ui", '"Helvetica Neue"', "Arial", "sans-serif"],
        body:    ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', "system-ui", "sans-serif"],
        mono:    ["ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo", "Monaco", "Consolas", "monospace"],
      },

      /* ── Type scale (Apple HIG-aligned) ── */
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem",    letterSpacing: "0" }],          /* 11px */
        xs:    ["0.75rem",   { lineHeight: "1rem",    letterSpacing: "-0.011em" }],    /* 12px meta */
        sm:    ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "-0.014em" }],    /* 13px meta */
        base:  ["0.9375rem", { lineHeight: "1.5rem",  letterSpacing: "-0.022em" }],    /* 15px body */
        md:    ["1rem",      { lineHeight: "1.5rem",  letterSpacing: "-0.022em" }],    /* 16px body */
        lg:    ["1.0625rem", { lineHeight: "1.5rem",  letterSpacing: "-0.022em" }],    /* 17px */
        xl:    ["1.1875rem", { lineHeight: "1.4rem",  letterSpacing: "-0.025em" }],    /* 19px H2 */
        "2xl": ["1.3125rem", { lineHeight: "1.3rem",  letterSpacing: "-0.028em" }],    /* 21px H1 */
        "3xl": ["1.5rem",    { lineHeight: "1.25rem", letterSpacing: "-0.030em" }],    /* 24px H1 */
        "4xl": ["1.75rem",   { lineHeight: "1.2rem",  letterSpacing: "-0.032em" }],    /* 28px H1 */
        "5xl": ["2rem",      { lineHeight: "1.15rem", letterSpacing: "-0.035em" }],    /* 32px display */
      },

      /* ── Brand + semantic colors ── */
      colors: {
        /* AMTME brand tokens */
        "amtme-navy":  "#083A4F",
        "amtme-sand":  "#E5E1DD",
        "amtme-teal":  "#407E8C",
        "amtme-gold":  "#A58D66",
        "amtme-hl":    "#E8FF40",

        /* shadcn semantic tokens */
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:               "hsl(var(--sidebar-background))",
          foreground:            "hsl(var(--sidebar-foreground))",
          primary:               "hsl(var(--sidebar-primary))",
          "primary-foreground":  "hsl(var(--sidebar-primary-foreground))",
          accent:                "hsl(var(--sidebar-accent))",
          "accent-foreground":   "hsl(var(--sidebar-accent-foreground))",
          border:                "hsl(var(--sidebar-border))",
          ring:                  "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },

      /* ── Border radius — Apple scale ── */
      borderRadius: {
        none: "0",
        xs:   "4px",
        sm:   "6px",
        md:   "8px",
        DEFAULT: "10px",
        lg:   "var(--radius)",         /* 14px */
        xl:   "16px",
        "2xl": "20px",
        "3xl": "28px",
        full: "9999px",
      },

      /* ── Spacing additions ── */
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "18":  "4.5rem",
      },

      /* ── Apple motion tokens ── */
      transitionDuration: {
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "220": "220ms",
        "300": "300ms",
      },
      transitionTimingFunction: {
        "apple":    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "apple-in": "cubic-bezier(0.42, 0, 1, 1)",
        "apple-out":"cubic-bezier(0, 0, 0.58, 1)",
        "spring":   "cubic-bezier(0.34, 1.28, 0.64, 1)",
      },

      /* ── Shadows — box-shadow tokens ── */
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        /* Focus ring */
        "focus": "0 0 0 3px hsl(var(--ring) / 0.35)",
        /* Card hover */
        "card-hover": "var(--shadow-md)",
        /* Inset — Apple inputs */
        "inset-sm": "inset 0 1px 2px rgba(0,0,0,0.06)",
      },

      /* ── Keyframes ── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.99)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":  "fade-in 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "slide-up": "slide-up 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "scale-in": "scale-in 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "shimmer":  "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
