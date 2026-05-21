import { resolveFactoryOptions } from '../options'
import { makeResolveTag } from '../resolver'
import { createClassPipeline } from '../styles'
import type {
  AnyRecord,
  ClassName,
  ClassPipelineFn,
  ClassPipelineOptions,
  ClassPlugin,
  ClassPluginFactory,
  DefaultOf,
  ElementType,
  FactoryOptions,
  IntrinsicProps,
  PolymorphicGenerics,
  PolymorphicRuntime,
  PresetMap,
  PresetOf,
  PropsOf,
  ResolvedFactoryOptions,
  VariantMap,
  VariantsOf,
} from '../types'
import { mergeProps } from '../utils'
import { AriaPolicyEngine } from '../validator'

/**
 * Creates a `PolymorphicRuntime` from the given factory options.
 *
 * Normalizes options, instantiates the class pipeline (or the provided `classPlugin`),
 * and returns a read-only runtime object with `resolveTag`, `resolveProps`,
 * `resolveClasses`, and `options`. Framework adapters consume this runtime to
 * drive rendering and validation.
 */
function resolveClassPipeline<Variants extends VariantMap>(
  options: { classPlugin?: ClassPluginFactory },
  resolved: ClassPipelineOptions<Variants>,
) {
  const pluginResult = options.classPlugin?.(resolved)
  const classPipeline = pluginResult?.pipeline ?? createClassPipeline(resolved)

  return { pluginResult, classPipeline }
}

function createRuntimeMethods<G extends PolymorphicGenerics>(
  resolved: ResolvedFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
  classPipeline: ClassPipelineFn,
  engine: AriaPolicyEngine,
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
      variantKey?: Extract<keyof PresetOf<G>, string>,
    ) {
      return classPipeline(tag, props, className, variantKey)
    },

    resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P) {
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
  resolved: ResolvedFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
  pluginResult?: TPlugin,
) {
  return pluginResult
    ? { ...methods, options: resolved, classPlugin: pluginResult }
    : { ...methods, options: resolved }
}

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset> = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const resolved = resolveFactoryOptions(options)
  const { pluginResult, classPipeline } = resolveClassPipeline(options, resolved)
  const engine = new AriaPolicyEngine(
    resolved.strict,
    resolved.ariaRules?.length ? { rules: resolved.ariaRules } : undefined,
  )
  const methods = createRuntimeMethods<G>(resolved, classPipeline, engine)

  return createRuntimeObject<G, typeof pluginResult>(
    methods,
    resolved,
    pluginResult,
  ) as unknown as PolymorphicRuntime<
    TDefault,
    Props,
    Variants,
    Extract<keyof TPreset, string>,
    TPreset
  >
}
