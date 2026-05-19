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
  ElementType,
  FactoryOptions,
  PolymorphicRuntime,
  ResolvedFactoryOptions,
  VariantMap,
  VariantProps,
} from '../types'
import { mergeProps } from '../utils'

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

function createRuntimeMethods<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  resolved: ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>,
  classPipeline: ClassPipelineFn,
) {
  return {
    resolveTag: makeResolveTag(resolved.defaultTag),

    resolveProps<P extends AnyRecord>(props: P) {
      return mergeProps(resolved.defaultProps, props)
    },

    resolveClasses(
      tag: ElementType,
      props: Props,
      className?: ClassName,
      variantKey?: Extract<keyof TPreset, string>,
    ) {
      return classPipeline(tag, props, className, variantKey)
    },
  }
}

function createRuntimeObject<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
  TMethods extends ReturnType<
    typeof createRuntimeMethods<
      ElementType,
      AnyRecord,
      Readonly<VariantMap>,
      Record<string, Partial<VariantProps<VariantMap>>>
    >
  >,
  TPlugin extends ClassPlugin | undefined,
>(
  methods: TMethods,
  resolved: ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>,
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
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset> = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  const resolved = resolveFactoryOptions(options)
  const { pluginResult, classPipeline } = resolveClassPipeline(options, resolved)
  const methods = createRuntimeMethods(resolved, classPipeline)

  return createRuntimeObject(methods, resolved, pluginResult)
}
