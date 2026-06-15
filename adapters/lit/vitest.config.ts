import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@praxis-kit/lit',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
})
