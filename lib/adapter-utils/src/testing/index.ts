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

export type {
  TailwindDisplayInput,
  TailwindDisplayParityAdapter,
  TailwindDisplayRenderer,
} from './tailwind-display-parity'
export {
  TAILWIND_DISPLAY_PARITY_COMPOUNDS,
  TAILWIND_DISPLAY_PARITY_VARIANTS,
  tailwindDisplayParitySuite,
} from './tailwind-display-parity'

export type {
  TailwindComposeParityAdapter,
  TailwindComposePrimaryWinsResult,
  TailwindComposeRenderResult,
} from './tailwind-compose-plugin-parity'
export {
  createComposeConflictFixture,
  TAILWIND_COMPOSE_CONFLICT_COMPONENT,
  tailwindComposePluginParitySuite,
} from './tailwind-compose-plugin-parity'

export type {
  TailwindAsChildPluginParityAdapter,
  TailwindAsChildPluginResult,
} from './tailwind-as-child-plugin-parity'
export {
  createCountedPlugin,
  tailwindAsChildPluginParitySuite,
} from './tailwind-as-child-plugin-parity'

export type {
  TailwindPolymorphicElementInput,
  TailwindPolymorphicElementParityAdapter,
  TailwindPolymorphicElementResult,
  TailwindPolymorphicElementStep,
} from './tailwind-polymorphic-element-parity'
export { tailwindPolymorphicElementParitySuite } from './tailwind-polymorphic-element-parity'
