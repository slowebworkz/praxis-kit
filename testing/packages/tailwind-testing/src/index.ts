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
