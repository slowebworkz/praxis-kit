// lib/diagnostics sits below @praxis-kit/guards in the dependency graph — see formatter.ts's
// identical note. isUndefined has no native guardz guard; isEqualTo(undefined) is guardz's own
// documented composition for it.
import { isEqualTo, isString } from 'guardz'
import type { Diagnostics } from './diagnostics'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from './presets'

const isUndefined = isEqualTo(undefined)

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
  if (isUndefined(value)) return fallback
  return isString(value) ? PRESETS_BY_MODE[value] : value
}
