import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType as CoreElementType,
  EmptyRecord,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps, SlotComponent } from './types'

/**
 * Extends FactoryOptions with React-specific configuration.
 * slotComponent is intentionally not in core — it is a React rendering concern.
 */
export type ReactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
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
}
