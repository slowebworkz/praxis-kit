import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'bench',
    include: ['src/**/*.bench.ts'],
    exclude: ['src/pipeline.bench.ts', 'src/react-compiler.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      exclude: ['src/pipeline.bench.ts', 'src/react-compiler.bench.ts'],
    },
  },
})
