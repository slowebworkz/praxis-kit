import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'react',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@/shared': new URL('./src/shared', import.meta.url).pathname,
      '@/current': new URL('./src/current', import.meta.url).pathname,
      '@/legacy': new URL('./src/legacy', import.meta.url).pathname,
    },
  },
})
