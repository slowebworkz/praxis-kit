import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/primitive.ts', 'src/contract.ts', 'src/styling.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
})
