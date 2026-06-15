import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'vue',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
