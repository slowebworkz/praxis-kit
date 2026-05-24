import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@polymorphic-ui/primitive': resolve(__dirname, '../primitive/src'),
    },
  },
  test: {
    name: 'styling',
    include: ['src/**/*.test.ts'],
  },
})
