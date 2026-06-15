import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'codemod',
    include: ['src/**/*.test.ts'],
  },
})
