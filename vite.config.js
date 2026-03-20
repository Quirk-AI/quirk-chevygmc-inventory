import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    compression({
      algorithm: "gzip",
      ext: ".gz",
    }),
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
    mode === "analyze" &&
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "ES2022",
    // Source maps disabled for production — internal tool served on Netlify.
    // Enable temporarily with: VITE_SOURCEMAP=true npm run build
    sourcemap: !!process.env.VITE_SOURCEMAP,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Large vendored libraries split into separate cacheable chunks.
          // react/react-dom are NOT listed here — the Vite React plugin
          // handles them via optimized deps, and manual chunking produces
          // an empty vendor-react artifact.
          "vendor-charts": ["recharts"],
          "vendor-xlsx": ["xlsx"],
          "vendor-virtual": ["@tanstack/react-virtual"],
        },
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
  },
}));
