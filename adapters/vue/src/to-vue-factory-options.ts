import type { FactoryOptions } from '@praxis-kit/core'
import { isFunction } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { VueFactoryOptions } from './vue-options'

/** Vue-specific addition on top of `FactoryOptions`. */
const VUE_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing a concrete contract `C` down to `C & VueFactoryOptions` — the type
 * `buildRuntime` is declared against. Single-generic, matching `createContractComponent`'s own
 * `C extends VueFactoryOptions` (Phase 2 of the `defineContract` refactor — was 5 independent
 * generics). See `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isVueFactoryOptions<C extends FactoryOptions>(
  options: C,
): options is C & VueFactoryOptions {
  return isFactoryOptionsLike(options, VUE_FIELD_VALIDATORS)
}
