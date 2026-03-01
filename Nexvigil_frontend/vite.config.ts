import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Raise warning threshold to 800kB (reasonable for a full dashboard app)
    chunkSizeWarningLimit: 800,
    // Enable source maps only in dev builds for debugging
    sourcemap: mode === "development",
    // Minification - esbuild is default and very fast
    minify: "esbuild",
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *
         * Goal: Split large vendor libraries into dedicated async chunks
         * so browsers can cache them independently. Route-level code already
         * splits via React.lazy() in App.tsx.
         *
         * Dependency sizes (approximate minified+gzip):
         *   react + react-dom       ~45 kB
         *   react-router-dom        ~25 kB
         *   @tanstack/react-query   ~35 kB
         *   recharts                ~90 kB
         *   framer-motion           ~75 kB
         *   lucide-react            ~50 kB (tree-shaken per import)
         *   radix-ui (all)          ~80 kB
         */
        manualChunks: (id) => {
          // ── Core React runtime ─────────────────────────────────────────
          if (id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }

          // ── Routing ────────────────────────────────────────────────────
          if (id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run/")) {
            return "vendor-router";
          }

          // ── Data fetching ──────────────────────────────────────────────
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }

          // ── Charts (largest single lib — isolate for caching) ──────────
          if (id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-") ||
            id.includes("node_modules/victory-") ||
            id.includes("node_modules/d3scale") ||
            id.includes("node_modules/d3shape")) {
            return "vendor-charts";
          }

          // ── Animation (framer-motion is large, keep isolated) ──────────
          if (id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/motion")) {
            return "vendor-motion";
          }

          // ── Radix UI primitives ────────────────────────────────────────
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }

          // ── Icons (lucide tree-shakes well, but keep separate) ─────────
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          // ── Utility libraries ──────────────────────────────────────────
          if (id.includes("node_modules/clsx") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/date-fns") ||
            id.includes("node_modules/zod") ||
            id.includes("node_modules/sonner") ||
            id.includes("node_modules/next-themes") ||
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/vaul") ||
            id.includes("node_modules/embla-carousel") ||
            id.includes("node_modules/input-otp") ||
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/@hookform/") ||
            id.includes("node_modules/react-day-picker") ||
            id.includes("node_modules/react-resizable-panels")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
}));
