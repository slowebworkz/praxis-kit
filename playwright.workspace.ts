import { defineWorkspace } from '@playwright/test'

// @playwright/experimental-ct-svelte is blocked at 1.58.2 and uses a
// playwright-core version incompatible with the 1.60.x types we use elsewhere.
// Svelte CT will be added here once the upstream package catches up.
export default defineWorkspace([
  'adapters/react/playwright-ct.config.ts',
  'adapters/vue/playwright-ct.config.ts',
])
