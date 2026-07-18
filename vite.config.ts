import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-progress",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
            "@tanstack/react-query",
            "@tanstack/react-table",
            "@supabase/supabase-js",
          ],
          "chart-vendor": ["recharts"],
          "export-vendor": ["xlsx", "jspdf", "jspdf-autotable"],
        },
      },
    },
  },
});
