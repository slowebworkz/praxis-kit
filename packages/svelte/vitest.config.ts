import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../../lib/primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../../lib/contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../../lib/styling/src', import.meta.url).pathname,
      '@polymorphic-ui/adapter-utils': new URL('../../lib/adapter-utils/src', import.meta.url)
        .pathname,
    },
    // Force browser builds so @testing-library/svelte gets the DOM-capable
    // svelte/internal entry, not the server one (which throws on mount()).
    conditions: ['browser', 'development'],
  },
  test: {
    name: 'svelte',
    include: ['src/**/*.test.ts'],
    exclude: ['src/ssr.test.ts'],
    environment: 'jsdom',
  },
})
