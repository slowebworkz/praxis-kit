import { defineConfig } from 'tsdown'

// Two entries so English is opt-in: `praxis-kit-diagnostics` (resolver, validator, types — no
// prose) and `praxis-kit-diagnostics/en` (the English catalog). A locale pack is a third,
// separate package that never touches `en`.
export default defineConfig({
  entry: { index: 'src/index.ts', en: 'src/en.ts' },
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.json',
  fixedExtension: false,
})
