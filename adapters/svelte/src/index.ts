export { createContractComponent } from './create-contract-component'
export { defineContractComponent } from '@praxis-kit/adapter-utils'
export type {
  AnyFactoryOptions,
  FactoryOptions,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
} from '@praxis-kit/core'
export type { SvelteFactoryOptions } from './svelte-options'
// Curated consumer surface only. The Svelte adapter's return value is a rich bundle object (not an
// opaque component), so it needs a few more types exposed than the VDOM adapters — but the runtime
// plumbing (`Runtime`, `TagResolver`/`PropsResolver`/`ClassResolver`, `RuntimeOptions`,
// `NormalizedOptions`, `ResolvedProps`, `WithChildRules`, …) stays internal. `./types` re-exports
// all of it; do not widen this back to `export type * from './types'`.
export type {
  BuiltRuntime,
  AnyBuiltRuntime,
  GenericsOf,
  ResolvedSlotProps,
  PolymorphicComponentProps,
} from './types'
