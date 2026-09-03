import type { Diagnostics, DiagnosticsMode } from '@praxis-kit/diagnostics'
import { throwDiagnostics, silentDiagnostics, resolveDiagnostics } from '@praxis-kit/diagnostics'

type OptionsShape = Readonly<{
  name?: string
  enforcement?: { diagnostics?: Diagnostics | DiagnosticsMode }
}>

/** The two fields every adapter's `NormalizedOptions` must supply. */
export type AdapterDefaults = {
  name: string
  diagnostics: Diagnostics
}

/**
 * Resolves the two fields that every adapter's `normalizeOptions` must provide:
 * `name` (required string) and `diagnostics` (required Diagnostics instance).
 *
 * Called by each adapter's `normalizeOptions` and spread into the result:
 *
 * ```ts
 * function normalizeOptions(options): NormalizedOptions {
 *   return { ...options, ...resolveAdapterCommonOptions(options) } as NormalizedOptions
 * }
 * ```
 *
 * The defaults (`'PolymorphicComponent'` and `throwDiagnostics`) match the convention used
 * by React, Vue, Preact, Solid, and Svelte. Adapters with different defaults
 * (e.g. Lit, Web: `silentDiagnostics`) pass an override argument.
 */
export function resolveAdapterCommonOptions(
  options: OptionsShape,
  defaultName = 'PolymorphicComponent',
  defaultDiagnostics: Diagnostics = throwDiagnostics,
): AdapterDefaults {
  return {
    name: options.name ?? defaultName,
    diagnostics: resolveDiagnostics(options.enforcement?.diagnostics, defaultDiagnostics),
  }
}

export { throwDiagnostics, silentDiagnostics }
