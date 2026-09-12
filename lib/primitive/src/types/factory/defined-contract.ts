import type { AnyRecord, SubComponentMap } from '../primitives'
import type { FactoryOptions, NormalizeFn } from './factory-options'
import type { StylingOptions } from './styling-options'
import type { EnforcementOptions } from './enforcement-options'
import type { ContractInput } from './contract-input'

/**
 * `defineContract`'s return type: `O`'s own resolved generics (recovered positionally from
 * `ContractInput`'s parameter list via `infer`), intersected with the fields
 * `defineContract`'s runtime normalization step guarantees are always present —
 * `defaults`/`normalize`/`styling`/`enforcement`/`subComponents` narrow from optional to required
 * without changing their declared value type. `diagnostics` and `onElement` stay optional exactly
 * as `FactoryOptions` declares them — see `@praxis-kit/adapter-utils`'s `define-contract.ts` for
 * why no safe non-`undefined` default exists for either.
 *
 * This is a type-level promise, not just documentation: it only holds because `defineContract`'s
 * runtime implementation actually spreads concrete defaults over the author's input (verified
 * against `resolveFactoryOptions`'s existing absent-field handling, so the defaults are runtime-
 * neutral) — a `DefinedContract` produced any other way (e.g. a hand-written `satisfies
 * DefinedContract<...>` object missing one of these fields) would be a lie the first time
 * downstream code reads it.
 */
export type DefinedContract<Props extends AnyRecord, O extends ContractInput<Props>> =
  O extends ContractInput<Props, infer TDefault, infer V, infer TPreset, infer TPlugin, infer TAllowed>
    ? FactoryOptions<TDefault, Props, V, TPreset, TPlugin, TAllowed> & {
        readonly tag: TDefault
        readonly name: string
        readonly defaults: Partial<NoInfer<Props>>
        readonly normalize: NormalizeFn<NoInfer<Props>> | ReadonlyArray<NormalizeFn<NoInfer<Props>>>
        readonly styling: StylingOptions<V, TPreset, TPlugin>
        readonly enforcement: EnforcementOptions<TAllowed>
        readonly subComponents: SubComponentMap
      }
    : never
