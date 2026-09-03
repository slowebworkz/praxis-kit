// Ported from `../pk` incrementally. In place: the type surface, contract diagnostics, state-prop
// normalizers, the ARIA spec/policy layer, and `StrictBase` severity routing. Still landing: the
// `AriaPolicyEngine` runtime (`./aria/polymorphic-validator`) and `./children`.
export * from './aria'
export * from './diagnostics'
export * from './props'
export * from './strict'
export * from './types'
