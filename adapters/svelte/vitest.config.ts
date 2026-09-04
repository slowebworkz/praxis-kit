import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    tsconfigPaths: true,
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
