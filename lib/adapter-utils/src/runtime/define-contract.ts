import type {
  ContractInput,
  ContractModelFrom,
  DefinedContract,
  ElementType,
} from '@praxis-kit/core'

/**
 * Takes a concrete contract input and establishes its canonical `ContractModel` from it — the
 * contract-definition boundary every adapter's `createContractComponent` builds on.
 *
 * Deliberately a typed identity function at runtime, not a normalizer — no defaults are injected,
 * no fields are added or removed. `O` is inferred once, from the literal argument, and
 * `ContractModelFrom<O>` (`contract-model.ts`) does the rest — the model's six dimensions are its
 * properties, not something this function's own signature has to think about individually.
 * `ContractInput`'s bound requires `tag` and `name`, each a non-empty string; `tag`/`name`
 * additionally reject the empty-string literal specifically, via a self-referential constraint on
 * `O` itself, since a field type alone can't express "reject this one specific literal."
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
>(options: O): DefinedContract<O, ContractModelFrom<O>> {
  return options as DefinedContract<O, ContractModelFrom<O>>
}
