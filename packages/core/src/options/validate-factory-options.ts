import type {
  AnyRecord,
  ElementType,
  RecipeMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '../types'
import { iterate } from '@praxis-kit/primitive'
import { ContractDiagnostics } from '@praxis-kit/contract'
import type { Diagnostics } from '@praxis-kit/diagnostics'

/**
 * Construction-time validation of the variant surface.
 *
 * A `presets` selection or `defaults` entry that references a variant key — or a
 * value of a key — not declared in `variants` resolves to no class at runtime,
 * silently. TypeScript catches this in typed usage, but untyped JS consumers and
 * `as`-cast escapes bypass it. This mirrors the type contract at runtime: warn
 * (`strict: 'warn'`) or throw (`strict: 'throw'`/`true`); a no-op when `false`.
 *
 * Runs once per factory (not per render). Render-time checks — unknown
 * `recipe`, undefined variant value at the call site — are a separate
 * follow-up (they require `strict` threaded into the class resolver).
 */
export function validateFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  V extends Readonly<VariantMap>,
  TPreset extends RecipeMap<V>,
>(resolved: ResolvedFactoryOptions<TDefault, Props, V, TPreset>, diagnostics: Diagnostics): void {
  if (!diagnostics.active) return
  const name = resolved.displayName ?? 'Component'
  const { variants } = resolved

  // `selection` is a variant-selection object (a preset value or `defaults`).
  // Typed as `object` so callers pass it without a cast; the single cast to an
  // indexable record is localized here.
  const checkSelection = (label: string, selection: object): void => {
    iterate.forEachEntry(selection as AnyRecord, (dim, value) => {
      // `null`/`undefined` is the "unset" sentinel and is skipped: a selection
      // that doesn't pick a dimension is a missing reference, not a dead one.
      // Only present values are checked against the declared variant states.
      if (value === undefined || value === null) return
      if (!variants || !Object.hasOwn(variants, dim)) {
        diagnostics.error(ContractDiagnostics.unknownVariantDim(name, label, dim))
        return
      }
      const states = variants[dim]!
      // CVA keys are always strings, so booleans coerce: `true` → `'true'`.
      // This matches render-time behaviour and means `disabled: true` correctly
      // validates against `disabled: { true: '...', false: '...' }`.
      const stateKey = String(value)
      if (!Object.hasOwn(states, stateKey)) {
        diagnostics.error(
          ContractDiagnostics.unknownVariantValue(name, label, dim, stateKey, Object.keys(states)),
        )
      }
    })
  }

  const { recipeMap } = resolved
  if (recipeMap) {
    iterate.forEachEntry(recipeMap, (recipeKey, selection) => {
      checkSelection(`preset "${recipeKey}"`, selection)
    })
  }

  if (resolved.defaultVariants) checkSelection('defaults', resolved.defaultVariants)
}
