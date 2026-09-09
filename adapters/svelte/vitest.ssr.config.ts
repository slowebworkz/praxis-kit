import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  // vite-plugin-svelte controls the generate target itself and ignores
  // compilerOptions.generate. Svelte 5's universal output works with both
  // svelte/server render() and the DOM mount() path.
  plugins: [svelte()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'svelte-ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
