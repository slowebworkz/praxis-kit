import type { AnyRecord } from './primitives'
import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { VariantMap } from './variant'

export type OwnedPropKeys = ReadonlySet<string>

export type ClassPlugin<TProps extends AnyRecord = Record<never, never>> = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
  readonly _pluginProps?: TProps
}>

export type ClassPluginFactory<TProps extends AnyRecord = Record<never, never>> = <
  V extends VariantMap,
>(
  options: ClassPipelineOptions<V>,
) => ClassPlugin<TProps>
