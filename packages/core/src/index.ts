// Ported from `../pk` incrementally. In place: the type surface (`./types`), shared utils
// (`./utils`), the `./primitive` / `./styling` re-export entries, and the HTML contract /
// spec / rules layer (`./html`) with `./children`. Still landing: `./options`, `./resolver`,
// `./state`, `./factory`, `./diagnose`, the `./contract` entry, and the full `.` barrel.
export type * from './types'
export * from './utils'
export * from './children'
export * from './html'
