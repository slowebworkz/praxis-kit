import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@/shared': new URL('../react/src/shared', import.meta.url).pathname,
      '@/current': new URL('../react/src/current', import.meta.url).pathname,
    },
  },
  test: {
    name: 'bench',
    include: ['src/**/*.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
  },
})
