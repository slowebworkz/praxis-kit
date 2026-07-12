import { resolve as resolvePath } from 'node:path'
import { defineConfig } from 'tsup'
import { solidPlugin } from 'esbuild-plugin-solid'
import rootPaths from '../../tsconfig.paths.json'

const adapterNoExternal = ['@praxis-kit/adapter-utils', '@praxis-kit/core']

// Diagnostics must NOT be bundled per entry: its classes have private members,
// so each inlined copy is nominally distinct at both the type and runtime
// level (separate `declare class Diagnostics` per d.ts, separate class per JS
// bundle). Instead it is built once into dist/_shared/diagnostics.* and every
// other entry imports it externally; scripts/postbuild.mjs rewrites the bare
// specifier to a relative path so it resolves inside the published package
// without an exports-map entry.
const diagnosticsExternal = ['@praxis-kit/diagnostics']

const sharedAlias = {
  '@praxis-kit/primitive': '../../lib/primitive/src',
}

// noExternal only bundles JS; the dts build must separately resolve internal
// workspace packages or the emitted .d.ts re-exports unpublished package names.
// tsup overrides baseUrl with "." (resolved against packages/kit), which breaks
// the workspace paths inherited from the root tsconfig — so the mappings must be
// passed here explicitly, with absolute values.
const ROOT = resolvePath(__dirname, '../..')

const dtsPaths: Record<string, string[]> = Object.fromEntries(
  Object.entries(rootPaths.compilerOptions.paths).map(([key, values]) => [
    key,
    values.map((rel) => resolvePath(ROOT, rel)),
  ]),
)
// In the type closure but missing from the root paths file
dtsPaths['@praxis-kit/runtime'] = [resolvePath(ROOT, 'runtime/core/src/index.ts')]
dtsPaths['@praxis-kit/runtime/*'] = [resolvePath(ROOT, 'runtime/core/src/*')]
dtsPaths['@praxis-kit/pipeline'] = [resolvePath(ROOT, 'lib/pipeline/src/index.ts')]
dtsPaths['@praxis-kit/pipeline/*'] = [resolvePath(ROOT, 'lib/pipeline/src/*')]

// Fresh object per config — tsup mutates the dts options it receives.
// Diagnostics is excluded from resolution so its declaration is imported from
// the shared chunk rather than duplicated into each entry's d.ts.
const bundledDts = () => ({
  resolve: [/^@praxis-kit\/(?!diagnostics$)/],
  compilerOptions: { baseUrl: ROOT, paths: dtsPaths },
})

// The shared diagnostics build is the one place that resolves everything,
// including its own internal deps (@praxis-kit/pipeline).
const sharedDiagnosticsDts = () => ({
  resolve: [/^@praxis-kit\//],
  compilerOptions: { baseUrl: ROOT, paths: dtsPaths },
})

export default [
  // Shared diagnostics chunk — single runtime module + single d.ts declaration
  // referenced by every other entry via relative specifier (see postbuild.mjs).
  defineConfig({
    entry: { '_shared/diagnostics': '../../lib/diagnostics/src/index.ts' },
    format: ['esm'],
    dts: sharedDiagnosticsDts(),
    tsconfig: '../../tsconfig.base.json',
    noExternal: ['@praxis-kit/pipeline'],
  }),

  // React — current (index) + legacy entry
  defineConfig({
    entry: {
      'react/index': '../../adapters/react/src/index.ts',
      'react/legacy': '../../adapters/react/src/legacy/index.ts',
    },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-react.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = {
        ...options.alias,
        ...sharedAlias,
        // react/shared is a self-reference within the react adapter source tree
        '@praxis-kit/react/shared': '../../adapters/react/src/shared',
      }
    },
  }),

  // Preact
  defineConfig({
    entry: { 'preact/index': '../../adapters/preact/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-preact.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Solid — custom JSX transform required. Solid doesn't support the React-style
  // automatic-runtime protocol esbuild's built-in JSX handling expects; babel-preset-solid
  // (via esbuild-plugin-solid, the same tool vite-plugin-solid wraps) compiles .tsx to Solid's
  // reactive DOM-expression output instead.
  defineConfig({
    entry: { 'solid/index': '../../adapters/solid/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-solid.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildPlugins: [solidPlugin()],
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Svelte — keep svelte itself external; source .svelte file distributed separately
  defineConfig({
    entry: { 'svelte/index': '../../adapters/svelte/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-svelte.json',
    noExternal: adapterNoExternal,
    external: ['svelte', 'svelte/*', ...diagnosticsExternal],
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Vue
  defineConfig({
    entry: { 'vue/index': '../../adapters/vue/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Lit
  defineConfig({
    entry: { 'lit/index': '../../adapters/lit/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Web (vanilla custom elements)
  defineConfig({
    entry: { 'web/index': '../../adapters/web/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Tailwind
  defineConfig({
    entry: { 'tailwind/index': '../../lib/tailwind/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: '../../tsconfig.base.json',
    noExternal: [...adapterNoExternal, '@praxis-kit/primitive'],
    external: diagnosticsExternal,
  }),

  // ESLint plugin — @typescript-eslint/utils stays external (peer dep of consumers)
  defineConfig({
    entry: { 'eslint/index': '../../plugins/eslint/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: '../../tsconfig.base.json',
  }),

  // TypeScript language service plugin — CJS required for tsserver loading
  defineConfig({
    entry: { 'ts-plugin/index': '../../plugins/typescript/src/index.ts' },
    format: ['cjs'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-ts-plugin.json',
    external: ['typescript'],
  }),

  // Vite plugin
  defineConfig({
    entry: { 'vite-plugin/index': '../../plugins/vite/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: '../../tsconfig.base.json',
  }),

  // Codemod CLI — shebang banner required for bin execution
  defineConfig({
    entry: { 'codemod/index': '../../tooling/codemod/src/index.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-codemod.json',
    banner: { js: '#!/usr/bin/env node' },
  }),

  // Contract — framework-agnostic prop normalizers, state contracts, PropNormalizer type
  defineConfig({
    entry: { 'contract/index': './contract.ts' },
    format: ['esm'],
    dts: bundledDts(),
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    external: diagnosticsExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),
]
