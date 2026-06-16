import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    name: '@praxis-kit/lit/ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
