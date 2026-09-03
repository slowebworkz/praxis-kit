// Ported from `../pk` incrementally. In place: `./types`, `./utils`, `./primitive` / `./styling`
// entries, the HTML layer (`./html` + `./children`), the resolver pipeline (`./resolver`) and
// the ARIA-engine re-export shim (`./validator`). Internal, not re-exported here yet: `./options`
// (factory-only), `./state` (goes to the `./contract` entry). Still landing: `./factory`,
// `./diagnose`, the `./contract` entry, and the full `.` barrel.
export type * from './types'
export * from './utils'
export * from './children'
export * from './html'
export * from './resolver'
export * from './validator'
