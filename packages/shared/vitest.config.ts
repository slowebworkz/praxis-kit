import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'shared',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
