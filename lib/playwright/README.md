# @praxis-kit/playwright

Playwright component-test helpers for praxis-kit interaction suites:

| Module           | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `aria.ts`        | ARIA snapshot assertions — assert the accessibility tree, not the DOM |
| `keyboard.ts`    | Keyboard interaction sequences (arrow-key navigation, focus loops)    |
| `axe.ts`         | axe-core accessibility sweeps                                         |
| `cardinality.ts` | Console catchers for children-rule (cardinality) violations           |
| `diagnostics.ts` | Bridges praxis diagnostics output into test assertions                |

Used by the Playwright suites configured in the root `playwright.workspace.ts`. Private, test-only —
never bundled into the published package.

Development: `pnpm --filter @praxis-kit/playwright test`, `typecheck`, `lint`.
