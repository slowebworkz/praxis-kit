import type { AnyRecord, EmptyRecord } from './primitives'
import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { VariantMap } from './variant'

export type OwnedPropKeys = ReadonlySet<string>

export type ClassPlugin<TProps extends AnyRecord = EmptyRecord> = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
  readonly _pluginProps?: TProps
}>

export type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
) => ClassPlugin<TProps>
