import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    name: '@praxis-kit/web/ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
