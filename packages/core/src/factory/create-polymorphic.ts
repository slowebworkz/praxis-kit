import { resolveFactoryOptions, validateFactoryOptions, validateRenderProps } from '../options'
import type {
  AnyClassPluginFactory,
  AnyRecord,
  ClassName,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  IntrinsicProps,
  PluginInstance,
  PolymorphicRuntime,
  RecipeMap,
  ResolvedFactoryOptions,
  ResolvedFactoryShape,
  VariantMap,
} from '../types'
import {
  memoizedAriaPipeline,
  memoizedHtmlChildrenEvaluatorPipeline,
  memoizedHtmlPropNormalizersPipeline,
  memoizedPropsPipeline,
  memoizedTagPipeline,
  resolveAriaPassthrough,
  resolveClassPlugin,
} from './pipelines'

// Erases a concretely-generic ResolvedFactoryOptions down to the pipeline modules' shared,
// non-generic ResolvedFactoryShape — same relationship as createClassPipeline's
// ClassPipelineOptions<VariantMap> accepting any concrete VariantMap. A single `as` (not
// `as unknown as`) is the correct assertion here, not an overcautious one: `recipeMap`'s
// VariantSelection<Variants> keys off `keyof Variants[K]`, which is `string | number | symbol`
// for a generic Variants — TS can't prove that matches ResolvedFactoryShape's erased
// `string | undefined` key type by plain assignment, even though every real Variants map is
// authored with string keys. `as` uses comparability rather than strict assignability, which is
// enough to bridge that specific, always-true-in-practice gap.
function eraseResolvedShape<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(resolved: ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>): ResolvedFactoryShape {
  return resolved as ResolvedFactoryShape
}

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> = {},
): PolymorphicRuntime<
  TDefault,
  Props,
  Variants,
  Extract<keyof TPreset, string>,
  TPreset,
  PluginInstance<TPlugin>
> {
  const baseResolved = resolveFactoryOptions(options)
  const anyBaseResolved = eraseResolvedShape(baseResolved)
  const resolved = Object.freeze({
    ...baseResolved,
    htmlPropNormalizersFn: memoizedHtmlPropNormalizersPipeline(anyBaseResolved),
    htmlChildrenEvaluatorFn: memoizedHtmlChildrenEvaluatorPipeline(anyBaseResolved),
  })
  const anyResolved = eraseResolvedShape(resolved)

  if (process.env.NODE_ENV !== 'production') {
    validateFactoryOptions(resolved, resolved.diagnostics)
  }

  const { pluginResult, classPipeline } = resolveClassPlugin(
    options.styling?.plugin,
    anyResolved,
    resolved.diagnostics,
  )
  const resolveTag = memoizedTagPipeline(anyResolved)
  const resolveProps = memoizedPropsPipeline(anyResolved)
  const resolveAriaFn =
    options.enforcement !== undefined ? memoizedAriaPipeline(anyResolved) : resolveAriaPassthrough

  // `packages/core` resolves the render-time capabilities and hands them to the adapter layer;
  // it does not run a full render itself. In particular `resolveProps` is a *component-level*
  // merge (`defaultProps` under caller props) only — the DOM-facing normalization step
  // (`resolved.htmlPropNormalizersFn` then `resolved.normalizeFn`, in that order) and children
  // evaluation (`resolved.htmlChildrenEvaluatorFn`, `childRules`) are applied by
  // `@praxis-kit/adapter-utils` (`resolveNormalizedProps` / `build-engines`), which every adapter
  // calls after `resolveProps` — so the ordering is identical whether a component renders through
  // React or SSR. `resolveAria` is the one enforcement step core runs inline, because the
  // `AriaPolicyEngine` also mutates props (removes an invalid attribute, injects `aria-live`).
  const methods = {
    resolveTag,

    resolveProps,

    resolveClasses(tag: ElementType, props: AnyRecord, className?: ClassName, recipe?: string) {
      if (process.env.NODE_ENV !== 'production') {
        validateRenderProps(resolved.diagnostics, resolved, props, recipe)
      }
      // An empty string here would render as a bare `class` (or `class=""`) attribute on the
      // host element instead of omitting it — normalize to undefined so every adapter's "no
      // class attribute" path (JSX omission, Svelte's set_attribute, Lit/Web's removeAttribute)
      // is the one that fires, regardless of which styling plugin produced the empty result.
      return classPipeline(tag, props, className, recipe) || undefined
    },

    resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P, extraProps?: IntrinsicProps) {
      return resolveAriaFn(tag, props, extraProps) as { props: P }
    },
  }

  const runtimeObject = pluginResult
    ? { ...methods, options: resolved, hasStyling: true as const, classPlugin: pluginResult }
    : { ...methods, options: resolved }

  return runtimeObject as PolymorphicRuntime<
    TDefault,
    Props,
    Variants,
    Extract<keyof TPreset, string>,
    TPreset,
    PluginInstance<TPlugin>
  >
}
