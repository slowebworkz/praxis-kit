import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'tailwind',
    include: ['src/**/*.test.ts'],
  },
})
