/**
 * Controls how validators respond to structural violations (ARIA rules, child cardinality, prop constraints).
 *
 * - `false`     — silent; no warning or error is produced
 * - `'warn'`    — logs a `console.warn` and continues
 * - `'throw'`   — throws an `Error` immediately
 * - `true`      — alias for `'throw'`; preserved for backwards compatibility
 */
export type StrictMode = boolean | 'warn' | 'throw'
