import type { AnyRecord, EmptyRecord } from '../primitives'
import type { StrictMode } from '../config'
import type { ClassPipelineOptions } from '../pipeline/class-pipeline-options'
import type { VariantMap } from '../variants/variant-map'
import type { ClassPlugin } from './class-plugin'

export type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  strict: StrictMode,
) => ClassPlugin<TProps>

export type ExtractPluginProps<TPlugin extends ClassPluginFactory<AnyRecord> | undefined> =
  TPlugin extends ClassPluginFactory<infer T>
    ? string extends keyof T
      ? EmptyRecord
      : T
    : EmptyRecord
