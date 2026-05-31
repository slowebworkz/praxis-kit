import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'example-vue',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
