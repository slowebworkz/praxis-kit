import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/core/vitest.config.ts',
  './packages/tailwind/vitest.config.ts',
  './packages/react/vitest.config.ts',
  './packages/docs/vitest.config.ts',
  './packages/vue/vitest.config.ts',
  './packages/preact/vitest.config.ts',
  './packages/solid/vitest.config.ts',
  './packages/solid/vitest.ssr.config.ts',
  './packages/svelte/vitest.config.ts',
  './packages/svelte/vitest.ssr.config.ts',
])
