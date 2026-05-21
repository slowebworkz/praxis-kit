import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    name: 'vue',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
