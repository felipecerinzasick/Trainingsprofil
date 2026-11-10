import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { blogPlugin } from "./blog/plugin.ts";

export default defineConfig({
  plugins: [react(), blogPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    sourcemap: true,
  },
});
