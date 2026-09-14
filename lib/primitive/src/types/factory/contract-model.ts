import type { AnyClassPluginFactory } from '../class'
import type { ElementType, AnyRecord, EmptyRecord } from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'

/**
 * The canonical, REQUIRED-field carrier of a contract's six generic dimensions — the contract-level
 * counterpart to `PolymorphicGenerics` (which carries the analogous, adapter-level dimensions with
 * the same "required fields, plain index access" shape, deliberately for the same reason: a field
 * that's always present needs no "was this actually supplied" ambiguity to read back out, unlike an
 * optional `FactoryOptions` field).
 *
 * Established **once**, at `defineContract`'s own call site (see that function — its generic
 * parameters default to extracting each dimension from the literal argument via a real, fresh,
 * unambiguous match, the same reliable mechanism `createContractComponent` already used pre-refactor
 * to infer several independent generics from one literal), then carried forward as a phantom marker
 * (`HasContractModel<M>`) rather than re-derived independently at every later stage. An earlier
 * design tried to re-derive each dimension from `FactoryOptions`'s own *optional* nested fields
 * after the fact, at every accessor call — confirmed broken for the very common case of a field
 * being genuinely absent (TypeScript resolves an evidence-free `infer` to the field's declared
 * *constraint*, not a tight empty default, silently reopening exactly the "everything permitted"
 * hole `defineContract`'s `tag`/`name` requirement exists to close, one layer down for every other
 * field). This model exists specifically so that mistake has nowhere left to happen: every field
 * here is required, so "present with a value" is the only state there is.
 */
export interface ContractModel<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  V extends Readonly<VariantMap> = Readonly<VariantMap>,
  // Fixed to `RecipeMap<VariantMap>` (the widest `V`), not the self-referential `RecipeMap<V>`
  // `FactoryOptions`/`StylingOptions` use — the same widest-bound fix a fully type-erased instance
  // needs generally. `TPreset extends RecipeMap<V>` is fine when every generic here is already
  // concrete (as it is everywhere `ContractModel` is actually *used*), but referencing this
  // interface's own still-abstract `V` from a still-abstract call site (`defineContract`'s own
  // return-type annotation, before any real call resolves its generics) hits a TypeScript
  // limitation verifying `RecipeMap<V>`'s assignability for an abstract `V` — confirmed empirically
  // while wiring `defineContract` up. Decoupling `TPreset` from this interface's own `V` avoids it.
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
 * at runtime, same rationale as `HasGenerics<G>` (see that type's own doc comment) — a
 * `defineContract` return value gets this shape via a type assertion, not a real property write.
 *
 * `__model` is **required**, not optional like `HasGenerics<G>`'s `__generics?` — a deliberate
 * difference, not an oversight. `HasGenerics<G>` needs `?` so a real callable component type
 * (`PolymorphicComponent<G>`) stays structurally assignable to `PolymorphicComponent<any>`-typed
 * test helpers; `HasContractModel<M>` has no such callable-type compatibility need, and *checking
 * for presence* is a real, common operation here (`contract-of.ts`'s accessors need to tell "this
 * went through `defineContract`" from "this is a raw literal" reliably) — an optional field can't
 * do that: `C extends HasContractModel<infer M>` would trivially "succeed" for *any* `C`, since
 * lacking an optional field is always fine, leaving `M` to resolve to `ContractModel`'s own wide
 * bound with no real evidence — the exact ambiguity this whole file exists to eliminate, just
 * moved one level out. A required field fails the `extends` check cleanly when genuinely absent,
 * which is the whole point.
 */
export interface HasContractModel<M extends ContractModel = ContractModel> {
  readonly __model: M
}

/**
 * Extracts each `ContractModel` dimension directly from a literal contract object `O` — used as
 * `defineContract`'s own parameter defaults (see that function), and as the fallback path for the
 * `Contract*Of` accessors (`contract-of.ts`) when `O` was never passed through `defineContract` at
 * all (a raw literal handed straight to `createContractComponent`, matching today's pre-refactor
 * ergonomics — the model isn't *required*, only established when possible).
 *
 * Each extractor matches a **required** (non-optional) nested pattern, not an optional one — the
 * deliberate fix for the bug this file's own doc comment describes: matching a literal that
 * genuinely lacks the field against a *required* pattern fails the whole `extends` check cleanly,
 * routing to the explicit `: <empty default>` branch, rather than leaving an unconstrained `infer`
 * to resolve itself against the field's declared bound.
 */
export type ExtractContractTag<O> = O extends { tag: infer TDefault extends ElementType }
  ? TDefault
  : ElementType

/**
 * Widens a recovered value's own primitive literal types back to their base type
 * (`'img'` → `string`, `1` → `number`, `true` → `boolean`) — `WidenLiteral` per-value,
 * `WidenShallow` applied once across an object's own top-level values.
 *
 * Necessary because `defineContract`'s `const O` type parameter treats every literal argument as
 * if `as const` were applied (see that function's doc comment) — so *every* value in `defaults`
 * arrives already narrowed to its exact literal, e.g. `{ 'data-slot': 'img' }` infers as
 * `{ readonly 'data-slot': 'img' }`, not `{ readonly 'data-slot': string }`. `defaults` supplies a
 * *default value*, not the only legal one — a consumer must still be able to pass a different
 * `data-slot` string. Left un-widened, `ExtractContractProps` would recover a prop type only the
 * contract's own default value satisfies, rejecting every other value a real caller needs to pass
 * (confirmed empirically: a wrapper providing its own different default value for a `defaults`-sourced
 * prop failed to typecheck without this).
 */
type WidenLiteral<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T

type WidenShallow<T> = { [K in keyof T]: WidenLiteral<T[K]> }

/**
 * See `ExtractContractTag`. Recovers `Partial<Props>` at best — `defaults` is the only
 * `Props`-revealing field a plain literal match can read without `FactoryOptions`'s own `NoInfer`
 * wrapping getting in the way (which only affects declared-type inference, not matching against
 * `O`'s own literal shape — see `defineContract`'s doc comment for the full context). Falls back
 * to a *tight* `EmptyRecord`, not `Props`'s own wide `AnyRecord` bound, when `defaults` is absent
 * — the fallback that matters is "this component declares no extra props," not "this component
 * could have any props at all"; using the bound here is the exact class of bug this file's own
 * doc comment describes, just one accessor over. Widened via `WidenShallow` (see that type's own
 * doc comment) and wrapped in `Partial`: a prop with a *default* value is, by definition, optional
 * from a caller's perspective — extracting `defaults`'s own value type directly, without `Partial`,
 * would make every defaulted prop *required* instead (confirmed empirically: a consumer omitting a
 * defaulted prop failed to typecheck without this).
 *
 * `data-${string}` keys are dropped from the recovered shape entirely — every adapter already has
 * its own dedicated `data-*` passthrough (`DataAttributes`/an index signature typed
 * `string | number | boolean | undefined`, finding #43's own fix), and a `data-*` key an author
 * also happens to default (e.g. `defaults: { 'data-slot': 'box' }`) would otherwise be recovered
 * here too, narrowing that one key back down to `string` and colliding with the adapter's own
 * wider passthrough type for the exact same key (confirmed empirically: this silently broke a
 * consumer providing a non-string default, and a wrapper trying to forward the widened attribute).
 * The existing passthrough already covers every `data-*` key adequately; recovering it a second,
 * narrower way here has no upside.
 */
export type ExtractContractProps<O> = O extends { defaults: infer Props extends AnyRecord }
  ? Partial<WidenShallow<Omit<Props, Extract<keyof Props, `data-${string}`>>>>
  : EmptyRecord

/** See `ExtractContractTag` and `ExtractContractProps`'s note on tight vs. wide fallbacks — falls
 *  back to `Readonly<EmptyRecord>` ("no variants"), not `Variants`'s own wide `Readonly<VariantMap>`
 *  bound. */
export type ExtractContractVariants<O> = O extends {
  styling: { variants: infer V extends Readonly<VariantMap> }
}
  ? V
  : Readonly<EmptyRecord>

/**
 * See `ExtractContractTag` and `ExtractContractProps`'s note on tight vs. wide fallbacks — falls
 * back to `Readonly<EmptyRecord>` ("no presets"), not `TPreset`'s own wide bound.
 *
 * Matches against `RecipeMap<VariantMap>` (the widest `V`), not `RecipeMap<V>` for the contract's
 * *own* (possibly still-abstract) `V` — the same "decouple from a still-abstract sibling
 * parameter" fix `ContractModel`'s own `TPreset` needs, and for the identical reason: verifying
 * `RecipeMap<V>`'s assignability against anything, for an abstract `V`, hits a real TypeScript
 * limitation over that type's `keyof V[K]` mapped-type position (confirmed empirically wiring
 * `defineContract` up — every one of `V`, `TPreset`, and this extractor has to agree on
 * `RecipeMap<VariantMap>`, not thread a shared, still-abstract `V` through each other).
 */
export type ExtractContractPreset<O> = O extends {
  styling: { presets: infer TPreset extends RecipeMap<VariantMap> }
}
  ? TPreset
  : Readonly<EmptyRecord>

/** See `ExtractContractTag`. `AnyClassPluginFactory` already includes `undefined` ("no plugin"),
 *  so there's no separate empty-vs-absent distinction to make here the way there is for
 *  variants/presets. */
export type ExtractContractPlugin<O> = O extends {
  styling: { plugin: infer TPlugin extends AnyClassPluginFactory }
}
  ? TPlugin
  : AnyClassPluginFactory

/** See `ExtractContractTag`. */
export type ExtractContractAllowed<O> = O extends {
  enforcement: { allowedAs: readonly (infer TAllowed extends ElementType)[] }
}
  ? TAllowed
  : ElementType

/**
 * Assembles a `ContractModel` from a raw literal `O` by running all six `Extract*` helpers above —
 * the fallback path `ContractModelOf<C>` uses when `C` never went through `defineContract` (no
 * `__model` marker to read directly). Kept as its own named type, not inlined into
 * `ContractModelOf`, so every `Contract*Of` accessor (`contract-of.ts`) shares exactly one place
 * that does this reconstruction, instead of each repeating a `HasContractModel` check plus its own
 * copy of the six-extractor assembly.
 */
export type ContractModelFromRaw<O> = ContractModel<
  ExtractContractTag<O>,
  ExtractContractProps<O>,
  ExtractContractVariants<O>,
  ExtractContractPreset<O>,
  ExtractContractPlugin<O>,
  ExtractContractAllowed<O>
>

/**
 * The single place that resolves "does `C` carry a real `ContractModel` already, or do we need to
 * reconstruct one from its raw shape" — every `Contract*Of` accessor in `contract-of.ts` is now a
 * one-line projection off this (`ContractModelOf<C>['variants']`, etc.), rather than independently
 * repeating the same `HasContractModel` check.
 */
export type ContractModelOf<C> = C extends HasContractModel<infer M> ? M : ContractModelFromRaw<C>
