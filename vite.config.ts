import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for stellar-sdk to work in browser
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Polyfill for Node.js buffer module
      buffer: "buffer",
    },
  },
});
