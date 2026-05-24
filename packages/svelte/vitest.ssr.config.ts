import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  // vite-plugin-svelte controls the generate target itself and ignores
  // compilerOptions.generate. Svelte 5's universal output works with both
  // svelte/server render() and the DOM mount() path.
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
  },
  test: {
    name: 'svelte-ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
