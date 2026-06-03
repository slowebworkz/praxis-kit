import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'example-web',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
