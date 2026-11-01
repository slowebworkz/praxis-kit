# @praxis-kit/playwright-testing

Playwright component-test helpers for praxis-kit's interaction suites: ARIA role/name/snapshot
assertions, keyboard navigation sequences (`tabTo`, `arrowDownTo`, `press`, ...), axe accessibility
sweeps, and catchers for console messages and contract diagnostics (cardinality warnings and
friends).

Private and source-exporting; consumed as a `devDependency` by the adapters that have Playwright CT
specs (React and Vue). Requires `@playwright/test` as a peer dependency. It has its own unit tests
for the diagnostics helpers (`pnpm --filter @praxis-kit/playwright-testing test`). See
[`../../README.md`](../../README.md) for the workspace rules.
