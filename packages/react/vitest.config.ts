import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../../lib/primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../../lib/contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../../lib/styling/src', import.meta.url).pathname,
      '@polymorphic-ui/adapter-utils': new URL('../../lib/adapter-utils/src', import.meta.url)
        .pathname,
      '@/shared': new URL('./src/shared', import.meta.url).pathname,
      '@/current': new URL('./src/current', import.meta.url).pathname,
      '@/legacy': new URL('./src/legacy', import.meta.url).pathname,
    },
  },
  test: {
    name: 'react',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
})
