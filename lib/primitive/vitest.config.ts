import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'primitive',
    include: ['src/**/*.test.ts'],
  },
})
