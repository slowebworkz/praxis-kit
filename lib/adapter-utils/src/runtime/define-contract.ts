import type {
  AnyClassPluginFactory,
  AnyRecord,
  ContractInput,
  ContractModel,
  DefinedContract,
  ElementType,
  ExtractContractAllowed,
  ExtractContractPlugin,
  ExtractContractPreset,
  ExtractContractProps,
  ExtractContractTag,
  ExtractContractVariants,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'

/**
 * The contract-definition boundary: pins a plain configuration object to its own concrete,
 * literal type — the same single-generic-pinning trick `defineContractComponent` already uses,
 * pushed one join point earlier, at contract-authoring time rather than component-construction
 * time — and establishes this contract's `ContractModel` (its six generic dimensions, as one
 * required-field carrier) from that literal, once, with real evidence.
 *
 * Deliberately a typed identity function at runtime, not a normalizer — no defaults are injected,
 * no fields are added or removed. Its value is entirely at the type level: (1) `O` is inferred
 * once from the literal argument, the same single-generic-pinning `defineContractComponent`
 * already uses; (2) `ContractInput`'s bound requires `tag` and `name`, each a non-empty string —
 * nothing else in `FactoryOptions`/`AnyFactoryOptions` enforces either, and `{}` satisfies both
 * today; (3) `TDefault`/`Props`/`V`/`TPreset`/`TPlugin`/`TAllowed` are each derived from `O`'s own
 * literal shape (`ExtractContract*`, `contract-model.ts`) and carried forward as the
 * `ContractModel` phantom marker — established here, once, rather than re-derived independently
 * (and, per an earlier draft, unreliably) at every later stage. See `contract-model.ts`'s own doc
 * comment for why re-deriving each dimension from `FactoryOptions`'s optional fields after the
 * fact doesn't work for the common case of an absent field.
 *
 * `tag`/`name` additionally reject the empty-string literal specifically (not just any `string`)
 * — a self-referential constraint on `O` itself (`O['tag']`/`O['name']` checked against `''`),
 * since `ContractInput`'s own field types can't express "reject this specific literal" without
 * knowing which literal a given call actually supplies.
 *
 * ```ts
 * export const boxContract = defineContract({ tag: 'div', name: 'Box' })
 * export const buttonContract = defineContract({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: { variants: { intent: { primary: 'btn--primary' } } },
 * })
 * ```
 */
export function defineContract<
  const O extends ContractInput & {
    readonly tag: O['tag'] extends '' ? never : ElementType
    readonly name: O['name'] extends '' ? never : string
  },
  TDefault extends ElementType = ExtractContractTag<O>,
  Props extends AnyRecord = ExtractContractProps<O>,
  V extends Readonly<VariantMap> = ExtractContractVariants<O>,
  // Fixed to RecipeMap<VariantMap> (the widest V), not the self-referential RecipeMap<V> — see
  // ContractModel's own TPreset doc comment for why threading this function's own V through here
  // doesn't work for a still-abstract V.
  TPreset extends RecipeMap<VariantMap> = ExtractContractPreset<O>,
  TPlugin extends AnyClassPluginFactory = ExtractContractPlugin<O>,
  TAllowed extends ElementType = ExtractContractAllowed<O>,
>(options: O): DefinedContract<O, ContractModel<TDefault, Props, V, TPreset, TPlugin, TAllowed>> {
  return options as DefinedContract<O, ContractModel<TDefault, Props, V, TPreset, TPlugin, TAllowed>>
}
