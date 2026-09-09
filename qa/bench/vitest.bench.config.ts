import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'bench',
    include: ['src/**/*.bench.ts'],
    // pipeline.bench.ts / react-compiler.bench.ts: not yet implemented (render-level benches).
    // tabs.bench.ts: a real DOM benchmark (mounts React Tabs) — this config has no DOM
    // environment configured, unlike vitest.render.bench.config.ts (the `bench:render` script),
    // which does and is where this file actually runs.
    exclude: ['src/pipeline.bench.ts', 'src/react-compiler.bench.ts', 'src/tabs.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      exclude: ['src/pipeline.bench.ts', 'src/react-compiler.bench.ts', 'src/tabs.bench.ts'],
    },
  },
})
