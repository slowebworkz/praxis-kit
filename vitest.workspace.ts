import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/core/vitest.config.ts',
  './packages/tailwind/vitest.config.ts',
  './packages/react/vitest.config.ts',
  './packages/docs/vitest.config.ts',
])
