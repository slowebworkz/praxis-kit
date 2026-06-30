import type { AnyRecord, EmptyRecord } from '../primitives'
import type { ClassPipelineFn } from '../pipeline/class-pipeline-fn'
import type { OwnedPropKeys } from './owned-prop-keys'

export type ClassPlugin<TProps extends AnyRecord = EmptyRecord> = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
  readonly _pluginProps?: TProps
}>
