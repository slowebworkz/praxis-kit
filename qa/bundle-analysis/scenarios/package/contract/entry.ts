/**
 * Package-tier only — `praxis-kit/contract` is a pass-through re-export file that lives inside
 * packages/kit itself (packages/kit/contract.ts), not a distinct workspace package with its own
 * source tree, so there's no separate source/* scenario to ask "does the source graph tree-shake"
 * for it — see scripts/analyze.ts. This scenario measures the full real cost of the framework-
 * neutral contract-authoring surface: core + primitive + the shared diagnostics chunk, no adapter.
 */
export * from 'praxis-kit/contract'
