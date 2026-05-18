import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { VariantMap } from './variant'

/**
 * Semantic alias for a set of prop keys a class plugin declares ownership of.
 *
 * Framework adapters strip these keys from DOM/framework bindings automatically
 * so they never reach the rendered element as unknown attributes.
 */
export type OwnedPropKeys = ReadonlySet<string>

/**
 * The object returned by a `ClassPluginFactory`.
 *
 * `pipeline` replaces the built-in `createClassPipeline`. `ownedKeys` is optional —
 * omit it when the plugin consumes no additional props beyond the variant keys the
 * runtime already tracks.
 */
export type ClassPlugin = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
}>

/**
 * A factory that produces a `ClassPlugin` from the resolved pipeline options.
 *
 * Called once at `createPolymorphic` time. Generic over `V` so the factory
 * remains assignable regardless of the variant shape the caller declares —
 * required because `exactOptionalPropertyTypes` makes non-generic factory
 * signatures fail variance checks at the call site.
 */
export type ClassPluginFactory = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
) => ClassPlugin
