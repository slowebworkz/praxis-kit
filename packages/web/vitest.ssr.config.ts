import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@praxis-ui/web/ssr',
    include: ['src/ssr.test.ts'],
    environment: 'node',
  },
})
