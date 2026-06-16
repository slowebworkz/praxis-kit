import { defineConfig } from 'tsup'

const adapterNoExternal = ['@praxis-kit/adapter-utils', '@praxis-kit/core']

// @praxis-kit/shared is only linked under packages/kit/node_modules, not under
// adapters/*/node_modules. esbuild resolves from the source file's directory, so
// it can't find shared via normal module resolution. Aliases (resolved from CWD =
// packages/kit/) redirect it to source so esbuild can bundle it correctly.
const sharedAlias = {
  '@praxis-kit/shared': '../../packages/shared/src',
}

export default [
  // React — current (index) + legacy entry
  defineConfig({
    entry: {
      'react/index': '../../adapters/react/src/index.ts',
      'react/legacy': '../../adapters/react/src/legacy/index.ts',
    },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-react.json',
    noExternal: adapterNoExternal,
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
    dts: true,
    tsconfig: 'tsconfig.build-preact.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Solid — custom JSX transform required
  defineConfig({
    entry: { 'solid/index': '../../adapters/solid/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-solid.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'solid-js'
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Svelte — keep svelte itself external; source .svelte file distributed separately
  defineConfig({
    entry: { 'svelte/index': '../../adapters/svelte/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-svelte.json',
    noExternal: adapterNoExternal,
    external: ['svelte', 'svelte/*'],
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Vue
  defineConfig({
    entry: { 'vue/index': '../../adapters/vue/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Lit
  defineConfig({
    entry: { 'lit/index': '../../adapters/lit/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Web (vanilla custom elements)
  defineConfig({
    entry: { 'web/index': '../../adapters/web/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-base.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.alias = { ...options.alias, ...sharedAlias }
    },
  }),

  // Tailwind
  defineConfig({
    entry: { 'tailwind/index': '../../packages/tailwind/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../tsconfig.base.json',
    noExternal: [...adapterNoExternal, '@praxis-kit/shared', '@praxis-kit/primitive'],
  }),

  // ESLint plugin — @typescript-eslint/utils stays external (peer dep of consumers)
  defineConfig({
    entry: { 'eslint/index': '../../packages/eslint-plugin/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../tsconfig.base.json',
  }),

  // TypeScript language service plugin — CJS required for tsserver loading
  defineConfig({
    entry: { 'ts-plugin/index': '../../packages/ts-plugin/src/index.ts' },
    format: ['cjs'],
    dts: true,
    tsconfig: 'tsconfig.build-ts-plugin.json',
    external: ['typescript'],
  }),

  // Vite plugin
  defineConfig({
    entry: { 'vite-plugin/index': '../../packages/vite-plugin/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../tsconfig.base.json',
  }),

  // Codemod CLI — shebang banner required for bin execution
  defineConfig({
    entry: { 'codemod/index': '../../packages/codemod/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: 'tsconfig.build-codemod.json',
    banner: { js: '#!/usr/bin/env node' },
  }),
]
