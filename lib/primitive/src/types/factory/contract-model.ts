import type { AnyClassPluginFactory } from '../class'
import type { ElementType, AnyRecord, EmptyRecord } from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'

/**
 * The pipeline this file implements:
 *
 * ```text
 * O (a raw contract literal)
 *   → Contract*From<O>        one derivation per dimension, straight off O's own shape
 *   → ContractDimensions<O>   the six derivations, assembled
 *   → ContractModel<...>      the same six values, as a required-field carrier
 *   → ContractModelOf<C>      resolves an already-`defineContract`-ed C's real model,
 *                             or reconstructs one from a raw C via ContractModelFrom
 * ```
 *
 * See `DECISIONS.md`'s `defineContract` entry for the TypeScript limitations that shaped the
 * derivations below.
 */

/**
 * Canonical type-level representation of a contract's dimensions — the contract-level counterpart
 * to `PolymorphicGenerics`. Every field is required, so a field's presence is never ambiguous the
 * way it is on an optional `FactoryOptions` field.
 */
export interface ContractModel<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  V extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<VariantMap> = RecipeMap<VariantMap>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> {
  readonly tag: TDefault
  readonly props: Props
  readonly variants: V
  readonly preset: TPreset
  readonly plugin: TPlugin
  readonly allowed: TAllowed
}

/**
 * The phantom-marker shape read back via `T extends HasContractModel<infer M> ? M : ...` — the
 * contract-level counterpart to `lib/contract-props`'s `HasGenerics<G>`. Type-only: never assigned
 * at runtime.
 *
 * `__model` is **required**, not optional like `HasGenerics<G>`'s `__generics?` — an optional field
 * would make `C extends HasContractModel<infer M>` trivially succeed for any `C`, defeating the
 * one thing this marker exists to answer: did `C` really go through `defineContract`?
 */
export interface HasContractModel<M extends ContractModel = ContractModel> {
  readonly __model: M
}

// ── Derivations: one per dimension, straight off a raw literal `O` ───────────

type ContractTagFrom<O> = O extends { tag: infer TDefault extends ElementType }
  ? TDefault
  : ElementType

/** `'img'` → `string`, `1` → `number`, `true` → `boolean` — undoes `defineContract`'s `const O`
 *  literal narrowing so a `defaults` value doesn't become the only value a caller may pass. */
type WidenLiteral<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T

type WidenShallow<T> = { [K in keyof T]: WidenLiteral<T[K]> }

/** What the author explicitly declared, via `props: declareProps<Props>()`
 *  (`@praxis-kit/adapter-utils`) — used exactly as declared, no `Partial`/widening/`data-*`
 *  stripping (see `DefaultPropsFrom` for why those exist there but not here). */
type DeclaredPropsFrom<O> = O extends { props: infer Props extends object | undefined }
  ? [NonNullable<Props>] extends [never]
    ? never
    : NonNullable<Props> & AnyRecord
  : never

/** What can be inferred from `defaults` — partial at best, since a default only proves a prop
 *  *has* one, not that it's the complete prop set. `Partial`: a defaulted prop is optional to the
 *  caller by definition. `data-*` keys are dropped — every adapter has its own passthrough for
 *  those already (finding #43). */
type DefaultPropsFrom<O> = O extends { defaults: infer Props extends AnyRecord }
  ? Partial<WidenShallow<Omit<Props, Extract<keyof Props, `data-${string}`>>>>
  : never

/** Declared beats defaulted beats nothing. `[X] extends [never]`, not bare `X extends never` —
 *  tuple-wrapped so the check doesn't distribute if `X` is ever a union containing `never`. */
type ContractPropsFrom<O> = [DeclaredPropsFrom<O>] extends [never]
  ? [DefaultPropsFrom<O>] extends [never]
    ? EmptyRecord
    : DefaultPropsFrom<O>
  : DeclaredPropsFrom<O>

type ContractVariantsFrom<O> = O extends {
  styling: { variants: infer V extends Readonly<VariantMap> }
}
  ? V
  : Readonly<EmptyRecord>

type ContractPresetFrom<O> = O extends {
  styling: { presets: infer TPreset extends RecipeMap<VariantMap> }
}
  ? TPreset
  : Readonly<EmptyRecord>

type ContractPluginFrom<O> = O extends {
  styling: { plugin: infer TPlugin extends AnyClassPluginFactory }
}
  ? TPlugin
  : AnyClassPluginFactory

type ContractAllowedFrom<O> = O extends {
  enforcement: { allowedAs: readonly (infer TAllowed extends ElementType)[] }
}
  ? TAllowed
  : ElementType

// ── Assembly ─────────────────────────────────────────────────────────────────

/** The six derivations above, assembled — the direct input to `ContractModel`. */
export type ContractDimensions<O> = {
  readonly tag: ContractTagFrom<O>
  readonly props: ContractPropsFrom<O>
  readonly variants: ContractVariantsFrom<O>
  readonly preset: ContractPresetFrom<O>
  readonly plugin: ContractPluginFrom<O>
  readonly allowed: ContractAllowedFrom<O>
}

/**
 * Builds a `ContractModel` from a raw literal `O` — the fallback path `ContractModelOf<C>` uses
 * when `C` never went through `defineContract` (no `__model` marker to read directly), and what
 * `defineContract` itself attaches as that marker for a `C` that did.
 */
export type ContractModelFrom<O> =
  ContractDimensions<O> extends infer D extends ContractDimensions<O>
    ? ContractModel<D['tag'], D['props'], D['variants'], D['preset'], D['plugin'], D['allowed']>
    : never

/**
 * Resolves "does `C` carry a real `ContractModel` already, or do we need to build one from its raw
 * shape" — every `Contract*Of` accessor (`contract-of.ts`) is a one-line projection off this.
 */
export type ContractModelOf<C> = C extends HasContractModel<infer M> ? M : ContractModelFrom<C>
