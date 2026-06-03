import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@praxis-ui/lit/ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
