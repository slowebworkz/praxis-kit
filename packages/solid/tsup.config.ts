import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  noExternal: ['@praxis-kit/adapter-utils', '@praxis-kit/core'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'solid-js'
  },
})
