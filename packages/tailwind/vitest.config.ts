import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tailwind',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
  },
})
