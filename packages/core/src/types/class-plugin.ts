import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { AnyRecord } from './primitives'
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
 * `TProps` is a phantom type parameter: it carries the extra prop surface the plugin
 * introduces (e.g. `LayoutProps` for the Tailwind plugin) at the type level so
 * framework adapters can merge it into the component's public prop type automatically.
 * The `_pluginProps` field is never present on runtime objects — it exists only so
 * TypeScript can infer `TProps` when a typed plugin is passed as `classPlugin`.
 *
 * `pipeline` replaces the built-in `createClassPipeline`. `ownedKeys` is optional —
 * omit it when the plugin consumes no additional props beyond the variant keys the
 * runtime already tracks.
 */
export type ClassPlugin<TProps extends AnyRecord = Record<never, never>> = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
  readonly _pluginProps?: TProps
}>

/**
 * A factory that produces a `ClassPlugin` from the resolved pipeline options.
 *
 * `TProps` flows through to the returned `ClassPlugin` so callers can infer what
 * extra props the plugin contributes.
 *
 * Called once at `createPolymorphic` time. Generic over `V` so the factory
 * remains assignable regardless of the variant shape the caller declares —
 * required because `exactOptionalPropertyTypes` makes non-generic factory
 * signatures fail variance checks at the call site.
 */
export type ClassPluginFactory<TProps extends AnyRecord = Record<never, never>> = <
  V extends VariantMap,
>(
  options: ClassPipelineOptions<V>,
) => ClassPlugin<TProps>
