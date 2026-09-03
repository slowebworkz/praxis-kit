// Ported from `../pk` incrementally. In place: the type surface, contract diagnostics, state-prop
// normalizers, the ARIA spec/policy layer + `AriaPolicyEngine`, and `InvariantBase` severity
// routing. Still landing: `./children` (the `ChildrenEvaluator`).
export * from './aria'
export * from './diagnostics'
export * from './props'
export * from './strict'
export * from './types'
