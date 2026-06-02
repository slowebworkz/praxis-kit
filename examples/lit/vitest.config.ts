import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'example-lit',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
