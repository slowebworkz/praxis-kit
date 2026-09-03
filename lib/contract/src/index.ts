// Ported from `../pk` — the contract runtime is complete: the type surface, contract diagnostics,
// state-prop normalizers, the ARIA spec/policy layer + `AriaPolicyEngine`, `InvariantBase`
// severity routing, and the `ChildrenEvaluator` / `diagnoseChildren` structural child checks.
export * from './aria'
export * from './children'
export * from './diagnostics'
export * from './props'
export * from './strict'
export * from './types'
