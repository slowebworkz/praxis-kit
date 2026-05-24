import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tailwind',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../../lib/primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../../lib/contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../../lib/styling/src', import.meta.url).pathname,
    },
  },
})
