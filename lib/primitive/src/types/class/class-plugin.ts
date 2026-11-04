import type { AnyRecord, EmptyRecord } from '../primitives'
import type { ClassPipelineFn } from '../pipeline/class-pipeline-fn'
import type { OwnedPropKeys } from './owned-prop-keys'

/**
 * `TProps` is the strict prop shape the plugin contributes to a component's call signature (it may
 * be a discriminated union, e.g. mutually exclusive props). `TFlatProps` is the same props
 * flattened for the type-extraction path (`ContractProps<T>`), where a union is hostile to
 * `Omit` / `Pick` / rest-destructure. It defaults to `TProps`, i.e. no flattening.
 */
export type ClassPlugin<
  TProps extends AnyRecord = EmptyRecord,
  TFlatProps extends AnyRecord = TProps,
> = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
  readonly _pluginProps?: TProps
  readonly _pluginFlatProps?: TFlatProps
}>
