import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
    conditions: ['development', 'browser'],
  },
  test: {
    name: 'solid',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['src/ssr.test.tsx'],
    environment: 'jsdom',
  },
})
