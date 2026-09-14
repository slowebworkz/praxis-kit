import type { FactoryOptions } from '@praxis-kit/core'
import { isFunction, isObject } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { ReactFactoryOptions } from './react-options'

/** React-specific additions on top of `FactoryOptions`. */
const REACT_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  slotComponent: (v) => v === undefined || isFunction(v) || isObject(v),
  filterProps: (v) => v === undefined || isFunction(v),
  artifact: (v) => v === undefined || isObject(v),
}

/**
 * Type guard narrowing a concrete contract `C` down to `C & ReactFactoryOptions` — the type
 * `buildRuntime` is declared against. Single-generic, matching `createContractComponent`'s own
 * `C extends ReactFactoryOptions` (Phase 2 of the `defineContract` refactor — was 6 independent
 * generics). See `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isReactFactoryOptions<C extends FactoryOptions>(
  options: C,
): options is C & ReactFactoryOptions {
  return isFactoryOptionsLike(options, REACT_FIELD_VALIDATORS)
}
