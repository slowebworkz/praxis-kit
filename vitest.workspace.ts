import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  { configFile: './packages/core/vitest.config.ts' },
  { configFile: './packages/tailwind/vitest.config.ts' },
])
