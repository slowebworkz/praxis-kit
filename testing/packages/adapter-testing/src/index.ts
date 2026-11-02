export type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
  ConformanceComponent,
  ConformanceFactoryOptions,
  ConformanceRef,
  RenderResult,
} from './conformance'
export { conformanceSuite } from './conformance'

export { conformanceA11ySuite } from './a11y'

export type { SsrConformanceAdapter } from './ssr'
export { ssrConformanceSuite } from './ssr'

export type { HydrationConformanceAdapter } from './hydration'
export { hydrationParitySuite } from './hydration'

export { conformancePerformanceSuite } from './performance'
export { conformanceIsolationSuite } from './isolation'

export type { CompoundComponentAdapter, CompoundRender } from './compound-component'
export { compoundComponentSuite } from './compound-component'

export type {
  OnElementAdapter,
  OnElementHook,
  OnElementMounted,
  OnElementSwappable,
} from './on-element'
export { onElementSuite } from './on-element'
