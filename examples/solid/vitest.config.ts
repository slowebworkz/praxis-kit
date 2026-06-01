import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  resolve: {
    tsconfigPaths: true,
    conditions: ['development', 'browser'],
  },
  test: {
    name: 'example-solid',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
  },
})
