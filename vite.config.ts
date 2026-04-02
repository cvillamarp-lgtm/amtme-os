import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5174,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "react", "react-dom"],
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true },
    },
    cssMinify: "lightningcss",
    cssCodeSplit: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      output: {
        /**
         * manualChunks: Extract heavy vendor libraries into stable, named chunks.
         *
         * Without this, Vite puts vendor code into whichever page chunk first
         * imports it. When that page changes its hash, ALL dependent pages need
         * a new hash too — causing stale index.html to reference non-existent
         * chunks after deploy (the "Failed to fetch dynamically imported module" error).
         *
         * With named vendor chunks, page changes only affect the page chunk;
         * shared vendors stay stable across deploys.
         */
        manualChunks: (id) => {
          // React core — almost never changes
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // React Router
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          // Tanstack Query
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          // Supabase client — heavy, changes rarely
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // Recharts + D3 — very heavy (~300kB), used only in Metrics
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-recharts";
          }
          // Radix UI primitives — shared UI components
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Lucide icons — shared across all pages
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          // Utility helpers: clsx, cva, tailwind-merge, date-fns
          if (
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/date-fns")
          ) {
            return "vendor-utils";
          }
        },
      },
    },
  },
}));
