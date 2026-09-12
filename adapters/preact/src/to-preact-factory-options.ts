import type { FactoryOptions } from '@praxis-kit/core'
import { isFunction, isObject } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { PreactFactoryOptions } from './preact-options'

/** Preact-specific additions on top of `FactoryOptions`. */
const PREACT_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  slotComponent: (v) => v === undefined || isFunction(v) || isObject(v),
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing a concrete contract `C` down to `C & PreactFactoryOptions` — the type
 * `buildRuntime` is declared against. Single-generic, matching `createContractComponent`'s own
 * `C extends PreactFactoryOptions` (Phase 2 of the `defineContract` refactor — was 5 independent
 * generics). See `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isPreactFactoryOptions<C extends FactoryOptions>(
  options: C,
): options is C & PreactFactoryOptions {
  return isFactoryOptionsLike(options, PREACT_FIELD_VALIDATORS)
}
