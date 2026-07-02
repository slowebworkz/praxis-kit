import type { AnyRecord, EmptyRecord } from '../primitives'
import type { ClassPipelineOptions } from '../pipeline/class-pipeline-options'
import type { VariantMap } from '../variants'
import type { ClassPlugin } from './class-plugin'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  diagnostics: Diagnostics,
) => ClassPlugin<TProps>

export type ExtractPluginProps<TPlugin extends ClassPluginFactory<AnyRecord> | undefined> =
  TPlugin extends ClassPluginFactory<infer T>
    ? string extends keyof T
      ? EmptyRecord
      : T
    : EmptyRecord

export type PluginInstance<TPlugin extends ClassPluginFactory<AnyRecord> | undefined> =
  TPlugin extends ClassPluginFactory<infer TProps> ? ClassPlugin<TProps> : undefined
