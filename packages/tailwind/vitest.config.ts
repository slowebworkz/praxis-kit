import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tailwind',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@polymorphic-ui/core': `${import.meta.dirname}/../core/src/index.ts`,
    },
  },
})
