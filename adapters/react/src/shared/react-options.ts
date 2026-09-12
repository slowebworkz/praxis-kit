import type {
  AnyClassPluginFactory,
  ElementType as CoreElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { ComponentDefinition } from '@praxis-kit/runtime'
import type { StringMap } from '@praxis-kit/primitive'
import type { UnknownProps, SlotComponent } from './types'

/** Structural subset of `CompiledComponentArtifact` consumed by the React adapter. */
export interface CompiledArtifact {
  readonly definition: ComponentDefinition
  readonly precomputed?: {
    readonly variantLookup?: StringMap<string>
  }
}

/**
 * Extends FactoryOptions with React-specific configuration.
 * slotComponent is intentionally not in core — it is a React rendering concern.
 *
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * `AnyFactoryOptions`'s philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `ReactFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends ReactFactoryOptions` constraint — a real contract's non-empty `variants`/`presets`
 * must structurally satisfy that bound, which narrow defaults would reject (confirmed while
 * building `ContractInput`, the same fix applied there for the same reason).
 */
export type ReactFactoryOptions<
  TDefault extends CoreElementType = CoreElementType,
  Props extends UnknownProps = UnknownProps,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends CoreElementType = CoreElementType,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * The adapter strips nothing by default — implementations decide what is safe to drop.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  /** Pre-compiled artifact from the praxis-kit compiler. When provided, replaces the stub
   *  definition and enables the precomputed variant lookup fast path. */
  artifact?: CompiledArtifact
}
