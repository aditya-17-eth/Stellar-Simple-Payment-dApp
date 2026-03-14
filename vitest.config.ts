import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.test.tsx", "**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["html", "text"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.config.ts",
        "**/*.config.js",
        "src/test/**",
      ],
    },
  },
  // Required for stellar-sdk to work in tests
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
});
