import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../styling/src', import.meta.url).pathname,
    },
  },
  test: {
    name: 'adapter-utils',
    include: ['src/**/*.test.ts'],
  },
})
