import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'vite-plugin',
    include: ['src/**/*.test.ts'],
  },
})
