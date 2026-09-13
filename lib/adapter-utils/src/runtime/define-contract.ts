import type { ContractInput, DefinedContract } from '@praxis-kit/core'

/**
 * The contract-definition boundary: pins a plain configuration object to its own concrete,
 * literal type — the same single-generic-pinning trick `defineContractComponent` already uses,
 * pushed one join point earlier, at contract-authoring time rather than component-construction
 * time.
 *
 * Deliberately a typed identity function, not a normalizer — no defaults are injected, no fields
 * are added or removed at runtime. Its value is entirely at the type level: (1) `O` is inferred
 * once from the literal argument, giving every downstream consumer (`createContractComponent`,
 * `ContractProps`) a single already-resolved type to project from instead of re-inferring six
 * independent generics from a fresh object literal; (2) `ContractInput`'s bound requires `tag`
 * and `name` — nothing else in `FactoryOptions`/`AnyFactoryOptions` does, and `{}` satisfies both
 * today, which is the concrete problem this boundary exists to close.
 *
 * Takes exactly one type parameter (`O`), always inferred, never given explicitly — a real
 * TypeScript limitation, not a design preference: a `const` type parameter's literal-preserving
 * inference only engages when *no* type argument in the call is given explicitly (confirmed via a
 * minimal repro while building this), so a would-be second parameter for explicitly annotating
 * `Props` beyond what the literal already expresses (`defineContract<ButtonProps>(...)`) silently
 * broke `O`'s own inference back to `ContractInput`'s wide default. No real call site in this
 * codebase needs that today — every `createContractComponent` call across every adapter already
 * relies on full inference, zero explicit generics — so it's dropped rather than worked around.
 *
 * `tag`, `styling.variants`, `styling.presets`, `styling.plugin`, and `enforcement.allowedAs` all
 * infer directly from the literal; a component's own declared `Props` (beyond what `defaults`/
 * `onElement` reference) is recovered downstream by `ContractPropsOf<C>`, not pinned here.
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
export function defineContract<const O extends ContractInput = ContractInput>(
  options: O,
): DefinedContract<O> {
  return options
}
