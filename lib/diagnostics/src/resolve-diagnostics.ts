import type { Diagnostics } from './diagnostics'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from './presets'

export type DiagnosticsMode = 'warn' | 'throw' | 'silent'

const PRESETS_BY_MODE: Record<DiagnosticsMode, Diagnostics> = {
  warn: warnDiagnostics,
  throw: throwDiagnostics,
  silent: silentDiagnostics,
}

/**
 * Resolves an `enforcement.diagnostics` value — a preset name, a full `Diagnostics`
 * instance, or `undefined` — to a concrete `Diagnostics` instance. Lets authors write
 * `enforcement: { diagnostics: 'warn' }` without importing `Diagnostics` or the presets
 * themselves.
 */
export function resolveDiagnostics(
  value: Diagnostics | DiagnosticsMode | undefined,
  fallback: Diagnostics,
): Diagnostics {
  if (value === undefined) return fallback
  return typeof value === 'string' ? PRESETS_BY_MODE[value] : value
}
