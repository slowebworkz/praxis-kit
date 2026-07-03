# @praxis-kit/tree-shaking-tests

CI-gated tree-shaking assertions and gzip regression tracking for the published entry points.
Asserts that importing one export from an entry does not drag in unrelated machinery (e.g. the ARIA
engine when no `enforcement` is declared — the capability-driven gate must hold at bundle level, not
just at runtime), and that gzip sizes stay within tracked budgets.

These tests run against built output; run `pnpm --filter praxis-kit build` first when iterating
locally.
