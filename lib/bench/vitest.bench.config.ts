import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../styling/src', import.meta.url).pathname,
      '@polymorphic-ui/adapter-utils': new URL('../adapter-utils/src', import.meta.url).pathname,
      '@/shared': new URL('../../packages/react/src/shared', import.meta.url).pathname,
      '@/current': new URL('../../packages/react/src/current', import.meta.url).pathname,
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
