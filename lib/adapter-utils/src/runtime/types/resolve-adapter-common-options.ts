import type { Diagnostics, DiagnosticsMode } from '@praxis-kit/diagnostics'

export type OptionsShape = Readonly<{
  name?: string
  enforcement?: { diagnostics?: Diagnostics | DiagnosticsMode }
}>

/** The two fields every adapter's `NormalizedOptions` must supply. */
export type AdapterDefaults = {
  name: string
  diagnostics: Diagnostics
}
