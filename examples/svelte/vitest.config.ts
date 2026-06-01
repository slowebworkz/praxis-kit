import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    tsconfigPaths: true,
    conditions: ['browser', 'development'],
  },
  test: {
    name: 'example-svelte',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
