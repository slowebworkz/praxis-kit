import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'primitive',
    include: ['src/**/*.test.ts'],
  },
})
