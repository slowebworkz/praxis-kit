import type { ComponentType } from 'react'
import type {
  AnyRecord,
  ElementType as CoreElementType,
  FactoryOptions,
  VariantMap,
  VariantProps,
} from '@polymorphic-ui/core'

/**
 * Extends FactoryOptions with React-specific configuration.
 * slotComponent is intentionally not in core — it is a React rendering concern.
 */
export type ReactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
> = FactoryOptions<TDefault, Props, Variants, TPreset> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: ComponentType<AnyRecord>
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * The adapter strips nothing by default — implementations decide what is safe to drop.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
