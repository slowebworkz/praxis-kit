import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/legacy/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  noExternal: ['@praxis-kit/adapter-utils'],
})
