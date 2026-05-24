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
      '@polymorphic-ui/react': new URL('../react/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/tailwind': new URL('../tailwind/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/vue': new URL('../vue/src/index.ts', import.meta.url).pathname,
      '@/shared': new URL('../react/src/shared', import.meta.url).pathname,
      '@/current': new URL('../react/src/current', import.meta.url).pathname,
      '@/legacy': new URL('../react/src/legacy', import.meta.url).pathname,
    },
  },
  test: {
    name: 'docs',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
})
