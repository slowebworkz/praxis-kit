import type { FactoryOptions } from '@praxis-kit/core'
import { isFunction } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { LitFactoryOptions } from './types'

/** Lit-specific addition on top of `FactoryOptions`. */
const LIT_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing a concrete contract `C` down to `C & LitFactoryOptions` — the type
 * `buildRuntime` is declared against. Single-generic, matching `createContractComponent`'s own
 * `C extends LitFactoryOptions` (Phase 2 of the `defineContract` refactor — was 4 independent
 * generics). See `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isLitFactoryOptions<C extends FactoryOptions>(
  options: C,
): options is C & LitFactoryOptions {
  return isFactoryOptionsLike(options, LIT_FIELD_VALIDATORS)
}
