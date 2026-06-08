import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@praxis-kit/lit/ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
