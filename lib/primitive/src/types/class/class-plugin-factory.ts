import type { AnyRecord, EmptyRecord, NoPluginProps } from '../primitives'
import type { ClassPipelineOptions } from '../pipeline/class-pipeline-options'
import type { VariantMap } from '../variants'
import type { ClassPlugin } from './class-plugin'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { KeysOfUnion, Simplify } from 'type-fest'

export type ClassPluginFactory<
  TProps extends AnyRecord = EmptyRecord,
  TFlatProps extends AnyRecord = TProps,
> = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  diagnostics: Diagnostics,
) => ClassPlugin<TProps, TFlatProps>

/** `ClassPluginFactory` with its plugin-owned-props generic erased — the common form used
 *  wherever a factory's concrete plugin-props shape isn't tracked (factory generics,
 *  capability wiring). */
export type AnyClassPluginFactory = ClassPluginFactory<AnyRecord, AnyRecord> | undefined

export type ExtractPluginProps<TPlugin extends AnyClassPluginFactory> =
  TPlugin extends ClassPluginFactory<infer T, AnyRecord>
    ? string extends keyof T
      ? NoPluginProps
      : T
    : NoPluginProps

/** The plugin's flattened, extraction-path props (`ClassPlugin`'s `TFlatProps`). Equal to
 *  `ExtractPluginProps` for a plugin that declares no separate flat shape. */
export type ExtractPluginFlatProps<TPlugin extends AnyClassPluginFactory> =
  TPlugin extends ClassPluginFactory<AnyRecord, infer F>
    ? string extends keyof F
      ? NoPluginProps
      : F
    : NoPluginProps

/**
 * Flattens the plugin-contributed part of an already-merged prop object `P` for the
 * type-extraction path: drops every key the plugin's strict props can set, then adds the plugin's
 * own flat shape back. Knows nothing about any particular plugin's props — the plugin declares
 * both shapes.
 *
 * Returns `P` untouched when the plugin declares no distinct flat shape (strict and flat are
 * mutually assignable), so the `Omit` never runs for a plugin-less component or one whose props
 * are already flat.
 */
export type FlattenPluginProps<P, TPlugin extends AnyClassPluginFactory> = [P] extends [never]
  ? never
  : [ExtractPluginProps<TPlugin>] extends [ExtractPluginFlatProps<TPlugin>]
    ? [ExtractPluginFlatProps<TPlugin>] extends [ExtractPluginProps<TPlugin>]
      ? P
      : FlattenWith<P, ExtractPluginProps<TPlugin>, ExtractPluginFlatProps<TPlugin>>
    : FlattenWith<P, ExtractPluginProps<TPlugin>, ExtractPluginFlatProps<TPlugin>>

type FlattenWith<P, TStrict, TFlat> = Simplify<Omit<P, KeysOfUnion<TStrict>> & TFlat>

export type PluginInstance<TPlugin extends AnyClassPluginFactory> =
  TPlugin extends ClassPluginFactory<infer TProps, infer TFlat>
    ? ClassPlugin<TProps, TFlat>
    : undefined
