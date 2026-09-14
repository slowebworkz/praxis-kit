import type { FactoryOptions } from '@praxis-kit/core'
import { isFunction } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { WebFactoryOptions } from './types/index'

/** Web-specific addition on top of `FactoryOptions`. */
const WEB_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing a concrete contract `C` down to `C & WebFactoryOptions` — the type
 * `buildRuntime` is declared against. Single-generic, matching `createContractComponent`'s own
 * `C extends WebFactoryOptions` (Phase 2 of the `defineContract` refactor — was 4 independent
 * generics). See `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isWebFactoryOptions<C extends FactoryOptions>(
  options: C,
): options is C & WebFactoryOptions {
  return isFactoryOptionsLike(options, WEB_FIELD_VALIDATORS)
}
