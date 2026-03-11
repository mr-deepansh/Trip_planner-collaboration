import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Dev server (local only)
  server: {
    host: "0.0.0.0",
    port: 5173,
  },

  // Preview server — used when running `vite preview` (e.g. Render Web Service)
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 4173,
    allowedHosts: "all",
  },

  // Production build settings
  build: {
    outDir: "dist",
    sourcemap: false, // disable sourcemaps in prod (smaller bundle)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor libs into a separate chunk for better caching
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
