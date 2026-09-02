import { defineConfig } from 'vitest/config'

// Vitest 4 replaces the standalone `vitest.workspace.ts` (pk's approach) with
// `test.projects` here. Each package owns a `vitest.config.ts`; the glob picks
// them all up. The inline `root` project keeps Vitest happy while the glob still
// matches nothing — drop it once the first package lands.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      { test: { name: 'root', include: [] } },
      '{lib,packages,adapters,plugins,tooling,qa,examples}/*/vitest.config.ts',
    ],
  },
})
