import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './lib/primitive/vitest.config.ts',
  './lib/contract/vitest.config.ts',
  './lib/styling/vitest.config.ts',
  './lib/adapter-utils/vitest.config.ts',
  './packages/core/vitest.config.ts',
  './packages/tailwind/vitest.config.ts',
  './adapters/react/vitest.config.ts',
  './adapters/vue/vitest.config.ts',
  './adapters/preact/vitest.config.ts',
  './adapters/solid/vitest.config.ts',
  './adapters/solid/vitest.ssr.config.ts',
  './adapters/svelte/vitest.config.ts',
  './adapters/svelte/vitest.ssr.config.ts',
  './packages/codemod/vitest.config.ts',
  './packages/vite-plugin/vitest.config.ts',
  './examples/react/vitest.config.ts',
  './examples/vue/vitest.config.ts',
  './examples/preact/vitest.config.ts',
  './examples/solid/vitest.config.ts',
  './examples/svelte/vitest.config.ts',
])
