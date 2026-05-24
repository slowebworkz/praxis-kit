import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/primitive': new URL('../../lib/primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../../lib/contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../../lib/styling/src', import.meta.url).pathname,
    },
  },
  test: {
    name: 'core',
    include: ['src/**/*.test.ts'],
  },
})
