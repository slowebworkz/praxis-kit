import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'styling',
    include: ['src/**/*.test.ts'],
  },
})
