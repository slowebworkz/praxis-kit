/**
 * Controls how validators respond to structural violations (ARIA rules, child cardinality, prop constraints).
 *
 * - `false`        — silent; no warning or error is produced
 * - `'warn'`       — logs a `console.warn` synchronously and continues
 * - `'async-warn'` — defers `console.warn` via `queueMicrotask`; duplicate messages
 *                    within the same microtask batch are suppressed. Prevents double
 *                    warnings from React Strict Mode's intentional double-render.
 * - `'throw'`      — throws an `Error` immediately
 * - `true`         — alias for `'throw'`; preserved for backwards compatibility
 */
export type StrictMode = boolean | 'warn' | 'async-warn' | 'throw'
