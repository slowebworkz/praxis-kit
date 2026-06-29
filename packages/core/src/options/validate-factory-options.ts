import { iterate } from '@praxis-kit/primitive'
import type {
  AnyRecord,
  ElementType,
  RecipeMap,
  ResolvedFactoryOptions,
  StrictMode,
  VariantMap,
} from '../types'

// Mirrors the StrictBase semantics: silent when off, console.warn on 'warn' /
// 'async-warn' (construction-time warnings are one-shot, so no deferral needed),
// throw on 'throw' / true.
function report(strict: StrictMode, message: string): void {
  if (strict === false) return
  const mode = strict === true ? 'throw' : strict
  if (mode === 'throw') throw new Error(message)
  console.warn(message)
}

/**
 * Construction-time validation of the variant surface, gated on `strict`.
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
>(resolved: ResolvedFactoryOptions<TDefault, Props, V, TPreset>): void {
  const { strict } = resolved
  if (strict === false) return

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
        report(strict, `${name}: ${label} references unknown variant "${dim}".`)
        return
      }
      const states = variants[dim]!
      // CVA keys are always strings, so booleans coerce: `true` → `'true'`.
      // This matches render-time behaviour and means `disabled: true` correctly
      // validates against `disabled: { true: '...', false: '...' }`.
      const stateKey = String(value)
      if (!Object.hasOwn(states, stateKey)) {
        report(
          strict,
          `${name}: ${label} sets "${dim}" to unknown value "${stateKey}" ` +
            `(valid: ${Object.keys(states).join(', ')}).`,
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
