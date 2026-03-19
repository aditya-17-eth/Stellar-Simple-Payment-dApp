import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',      // 🔥 fixes worker crash (replaces deprecated threads: false)
    setupFiles: ['./src/setupTests.ts'],
  },
})