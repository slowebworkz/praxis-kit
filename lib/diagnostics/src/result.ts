import type { Diagnostic } from './diagnostic'

export interface ValidationResult {
  valid: boolean
  diagnostics: readonly Diagnostic[]
}

export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E = ValidationResult> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}
