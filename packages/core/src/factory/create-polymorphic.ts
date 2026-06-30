import { makeResolveTag, mergeProps } from '@praxis-kit/primitive'
import type {
  AnyRecord,
  AriaEngine,
  Capabilities,
  ClassName,
  ClassPipelineFn,
  ClassPipelineOptions,
  ClassPlugin,
  ClassPluginFactory,
  DefaultOf,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  IntrinsicProps,
  PluginInstance,
  PolymorphicGenerics,
  PolymorphicRuntime,
  RecipeMap,
  RecipeOf,
  PropsOf,
  ResolvedFactoryOptions,
  StrictMode,
  VariantMap,
  VariantsOf,
} from '../types'
import { resolveFactoryOptions, validateFactoryOptions, validateRenderProps } from '../options'
import { diagnosticsFromStrictMode } from '../contract'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { assertPluginShape, guardPipeline } from './plugin-invariants'

declare const process: { env: { NODE_ENV: string } }

// Noop pipeline used when no capabilities are injected (primitive-only path).
const NOOP_CLASS_PIPELINE: ClassPipelineFn = (_tag, _props, className) =>
  Array.isArray(className) ? className.join(' ') : (className ?? '')

function resolveClassPipeline<TVariants extends VariantMap>(
  options: { styling?: { plugin?: ClassPluginFactory<AnyRecord> | undefined } },
  resolved: ClassPipelineOptions<TVariants>,
  strict: StrictMode,
  capabilities?: Capabilities,
) {
  const factory = options.styling?.plugin
  if (!factory) {
    const createClassPipeline = capabilities?.createClassPipeline
    const classPipeline = createClassPipeline ? createClassPipeline(resolved) : NOOP_CLASS_PIPELINE
    return { pluginResult: undefined, classPipeline }
  }

  const pluginResult = factory(resolved, strict)
  assertPluginShape(pluginResult)
  const classPipeline = guardPipeline(pluginResult.pipeline)

  return { pluginResult, classPipeline }
}

function createRuntimeMethods<G extends PolymorphicGenerics>(
  resolved: ResolvedFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
  classPipeline: ClassPipelineFn,
  engine: AriaEngine | null,
  renderDiagnostics: Diagnostics,
) {
  return {
    resolveTag: makeResolveTag(resolved.defaultTag),

    resolveProps<P extends AnyRecord>(props: P) {
      return mergeProps(resolved.defaultProps, props)
    },

    resolveClasses(
      tag: ElementType,
      props: PropsOf<G>,
      className?: ClassName,
      recipe?: Extract<keyof RecipeOf<G>, string>,
    ) {
      if (process.env.NODE_ENV !== 'production') {
        validateRenderProps(renderDiagnostics, resolved, props as AnyRecord, recipe)
      }
      return classPipeline(tag, props, className, recipe)
    },

    resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P) {
      if (!engine) return { props }
      const result = engine.validate(tag, props)
      return { props: result.props as P }
    },
  }
}

function createRuntimeObject<
  G extends PolymorphicGenerics,
  TPlugin extends ClassPlugin | undefined,
>(
  methods: ReturnType<typeof createRuntimeMethods<G>>,
  resolved: ResolvedFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
  pluginResult?: TPlugin,
) {
  return pluginResult
    ? { ...methods, options: resolved, hasStyling: true as const, classPlugin: pluginResult }
    : { ...methods, options: resolved }
}

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> = {},
  capabilities?: Capabilities,
): PolymorphicRuntime<
  TDefault,
  Props,
  Variants,
  Extract<keyof TPreset, string>,
  TPreset,
  PluginInstance<TPlugin>
> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const baseResolved = resolveFactoryOptions(options)
  const resolved =
    capabilities?.htmlPropNormalizersFn !== undefined
      ? Object.freeze({
          ...baseResolved,
          htmlPropNormalizersFn: capabilities.htmlPropNormalizersFn,
        })
      : baseResolved
  // Construction-time contract check — dev-only (tree-shaken from production) and
  // further gated on `strict` inside. async-warn → warn: one-shot warnings don't
  // need deferral.
  if (process.env.NODE_ENV !== 'production') {
    const factoryStrict = resolved.strict === 'async-warn' ? 'warn' : resolved.strict
    validateFactoryOptions(resolved, diagnosticsFromStrictMode(factoryStrict))
  }
  const { pluginResult, classPipeline } = resolveClassPipeline(
    options,
    resolved,
    resolved.strict,
    capabilities,
  )

  const allAriaRules = [
    ...new Set([...(capabilities?.htmlAriaRules ?? []), ...(resolved.ariaRules ?? [])]),
  ]
  const engine =
    options.enforcement !== undefined && capabilities?.AriaEngine
      ? new capabilities.AriaEngine(
          diagnosticsFromStrictMode(resolved.strict),
          allAriaRules.length ? { rules: allAriaRules } : undefined,
        )
      : null

  const renderDiagnostics = diagnosticsFromStrictMode(resolved.strict)
  const methods = createRuntimeMethods<G>(resolved, classPipeline, engine, renderDiagnostics)

  return createRuntimeObject<G, typeof pluginResult>(
    methods,
    resolved,
    pluginResult,
  ) as unknown as PolymorphicRuntime<
    TDefault,
    Props,
    Variants,
    Extract<keyof TPreset, string>,
    TPreset,
    PluginInstance<TPlugin>
  >
}
