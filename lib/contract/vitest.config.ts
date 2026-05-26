import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'contract',
    include: ['src/**/*.test.ts'],
  },
})
