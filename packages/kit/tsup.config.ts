import { defineConfig } from 'tsup'

const adapterNoExternal = ['@praxis-kit/adapter-utils', '@praxis-kit/core']

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
  }),

  // Preact
  defineConfig({
    entry: { 'preact/index': '../../adapters/preact/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../adapters/preact/tsconfig.build.json',
    noExternal: adapterNoExternal,
  }),

  // Solid — custom JSX transform required
  defineConfig({
    entry: { 'solid/index': '../../adapters/solid/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../adapters/solid/tsconfig.build.json',
    noExternal: adapterNoExternal,
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'solid-js'
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
  }),

  // Vue
  defineConfig({
    entry: { 'vue/index': '../../adapters/vue/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../adapters/vue/tsconfig.build.json',
    noExternal: adapterNoExternal,
  }),

  // Lit
  defineConfig({
    entry: { 'lit/index': '../../adapters/lit/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../adapters/lit/tsconfig.build.json',
    noExternal: adapterNoExternal,
  }),

  // Web (vanilla custom elements)
  defineConfig({
    entry: { 'web/index': '../../adapters/web/src/index.ts' },
    format: ['esm'],
    dts: true,
    tsconfig: '../../adapters/web/tsconfig.build.json',
    noExternal: adapterNoExternal,
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
