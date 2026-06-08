import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/primitive.ts', 'src/contract.ts', 'src/styling.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // lib/ packages are private; inline them (js + dts) so published core has no unresolvable deps
  noExternal: [
    '@praxis-kit/primitive',
    '@praxis-kit/contract',
    '@praxis-kit/contract/types',
    '@praxis-kit/styling',
    '@praxis-kit/shared',
    '@praxis-kit/shared/types/primitives',
    '@praxis-kit/shared/types',
  ],
})
