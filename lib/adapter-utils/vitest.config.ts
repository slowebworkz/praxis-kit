import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'adapter-utils',
    include: ['src/**/*.test.ts'],
  },
})
