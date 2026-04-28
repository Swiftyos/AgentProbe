import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist",
    target: "es2022",
  },
  server: {
    // Proxy /api and SSE/event endpoints to the agentprobe server (default
    // 127.0.0.1:7878 — matches DEFAULT_PORT in src/runtime/server/config.ts).
    // Override with VITE_API_PROXY=http://host:port when running the server on
    // a non-default address.
    proxy: {
      "/api": process.env.VITE_API_PROXY ?? "http://127.0.0.1:7878",
      "/healthz": process.env.VITE_API_PROXY ?? "http://127.0.0.1:7878",
      "/readyz": process.env.VITE_API_PROXY ?? "http://127.0.0.1:7878",
    },
  },
});
