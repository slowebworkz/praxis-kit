import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  noExternal: ['@praxis-ui/adapter-utils'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'solid-js'
  },
})
