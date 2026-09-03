// Ported from `../pk` incrementally. In place: the type surface (`./types`), shared utils
// (`./utils`), and the `./primitive` / `./styling` re-export entries. Still landing: `./html`,
// `./options`, `./resolver`, `./state`, `./children`, `./factory`, `./diagnose`, the `./contract`
// entry, and the full `.` barrel — each with the slice that brings its modules.
export type * from './types'
export * from './utils'
