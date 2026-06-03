import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/primitive.ts', 'src/contract.ts', 'src/styling.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // lib/ packages are private; inline them (js + dts) so published core has no unresolvable deps
  noExternal: [
    '@praxis-ui/primitive',
    '@praxis-ui/contract',
    '@praxis-ui/contract/types',
    '@praxis-ui/styling',
  ],
})
