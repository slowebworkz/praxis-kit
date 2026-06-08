import type { StrictMode } from '@praxis-kit/core'

type OptionsShape = Readonly<{
  name?: string
  enforcement?: { strict?: StrictMode }
}>

/** The two fields every adapter's `NormalizedOptions` must supply. */
export type AdapterDefaults = {
  name: string
  strict: StrictMode
}

/**
 * Resolves the two fields that every adapter's `normalizeOptions` must provide:
 * `name` (required string) and `strict` (required StrictMode).
 *
 * Called by each adapter's `normalizeOptions` and spread into the result:
 *
 * ```ts
 * function normalizeOptions(options): NormalizedOptions {
 *   return { ...options, ...resolveAdapterCommonOptions(options) } as NormalizedOptions
 * }
 * ```
 *
 * The defaults (`'PolymorphicComponent'` and `'throw'`) match the convention used
 * by React, Vue, Preact, Solid, and Svelte. Adapters with different defaults
 * (e.g. Lit: `'PolymorphicElement'` / `false`) pass override arguments.
 */
export function resolveAdapterCommonOptions(
  options: OptionsShape,
  defaultName = 'PolymorphicComponent',
  defaultStrict: StrictMode = 'throw',
): AdapterDefaults {
  return {
    name: options.name ?? defaultName,
    strict: options.enforcement?.strict ?? defaultStrict,
  }
}
