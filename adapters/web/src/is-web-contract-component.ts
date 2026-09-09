import type { AnyRecord, EmptyRecord, NoVariants, VariantMap } from '@praxis-kit/core'
import { isFunction, isObject } from '@praxis-kit/primitive'
import type { WebContractComponent } from './types/index'

/**
 * Type guard narrowing a generated class down to the public
 * `WebContractComponent<TVariants, TPluginProps>` interface the adapter
 * exposes.
 *
 * Like Lit's contract type, this describes an actual constructable class
 * (`new (): ...`) plus a required `diagnostics` static property — both real
 * runtime facts to check, beyond the generic-erasure boundary every guard
 * in this codebase hits.
 *
 * In SSR (Node) environments `HTMLElement` itself is undefined — the class
 * still gets created (as a stub, see `BaseElement` in
 * create-contract-component.ts) so `registerForSsr` can register it, but
 * there's no `HTMLElement` to check `instanceof` against there, so that part
 * of the check is skipped when `HTMLElement` doesn't exist.
 *
 * `WebContractComponent`'s third parameter, `G` (the phantom `__generics`
 * marker `GenericsOf`/`ContractProps` read back — `./types/contract-props`), is
 * left at its default here: it carries no runtime signal for this guard to
 * check, and `createContractComponent` supplies the real `G` itself when it
 * casts this function's narrowed result to its public return type.
 */
export function isWebContractComponent<
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPluginProps extends AnyRecord = EmptyRecord,
>(value: unknown): value is WebContractComponent<TVariants, TPluginProps> {
  if (!isFunction(value)) return false
  // `typeof` guard, not `isUndefined(HTMLElement)`: the helper evaluates its argument and would
  // throw `ReferenceError` where the global is genuinely undeclared (SSR/Node).
  if (typeof HTMLElement !== 'undefined' && !(value.prototype instanceof HTMLElement)) return false
  if (!('diagnostics' in value)) return false
  return isObject(value.diagnostics)
}
