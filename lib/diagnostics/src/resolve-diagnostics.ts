// Guards come from ./guards, not @praxis-kit/guards: that package sits above this one.
import { isString, isUndefined } from '@praxis-kit/foundation'
import type { Diagnostics } from './diagnostics'
import type { MessageResolver } from './types'
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
  if (isUndefined(value)) return fallback
  return isString(value) ? PRESETS_BY_MODE[value] : value
}

/**
 * Builds a `Diagnostics` for a preset mode that resolves text with `messages`. Share the returned
 * instance across components (`enforcement: { diagnostics }`) to localize them; another instance
 * with a different resolver can be used at the same time, because nothing here is global.
 */
export function createDiagnostics(
  mode: DiagnosticsMode,
  options: { messages?: MessageResolver } = {},
): Diagnostics {
  return PRESETS_BY_MODE[mode].withMessages(options.messages)
}
