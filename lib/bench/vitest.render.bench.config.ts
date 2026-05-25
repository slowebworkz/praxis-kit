import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'bench-render',
    include: ['src/pipeline.bench.ts'],
    benchmark: {
      include: ['src/pipeline.bench.ts'],
    },
    environment: 'jsdom',
  },
})
