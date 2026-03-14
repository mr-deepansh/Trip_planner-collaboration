import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-fallback",
      generateBundle(options, bundle) {
        const indexHtml = bundle["index.html"];
        if (indexHtml) {
          const routes = ["login", "register", "forgot-password", "reset-password"];
          routes.forEach((route) => {
            this.emitFile({
              type: "asset",
              fileName: `${route}.html`,
              source: indexHtml.source,
            });
          });
        }
      },
    },
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,
  },

  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    allowedHosts: ["trip-planner-collaboration.onrender.com", "localhost"],
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
