import { makeResolveTag, mergeProps } from '@praxis-kit/primitive'
import { AriaPolicyEngine } from '@praxis-kit/contract'
import { createClassPipeline } from '@praxis-kit/styling'
import { definePipeline } from '@praxis-kit/pipeline-kit'
import type { PipelineFactory } from '@praxis-kit/pipeline-kit'
import type {
  AnyRecord,
  ClassName,
  ClassPipelineOptions,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  IntrinsicProps,
  PluginInstance,
  PolymorphicRuntime,
  RecipeMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '../types'
import { resolveFactoryOptions, validateFactoryOptions, validateRenderProps } from '../options'
import { HTML_ARIA_RULES } from '../html/aria-rules'
import { getHtmlPropNormalizers } from '../html/prop-normalizers'
import { assertPluginShape, guardPipeline } from './plugin-invariants'

declare const process: { env: { NODE_ENV: string } }

// Same runtime as create-polymorphic-full.ts, rebuilt so every render-time mechanism (tag,
// props, classes, aria) is an explicit `createXPipeline(resolved) => Pipeline` — the
// PipelineFactory shape from @praxis-kit/pipeline-kit — instead of the class pipeline alone
// following that template and the rest being inlined ad hoc. Each is wrapped in `definePipeline`
// so it also picks up the same free memoization-by-resolved-identity that the class pipeline
// already got from createClassPipeline.

type AnyResolved = ResolvedFactoryOptions<ElementType, AnyRecord, VariantMap, RecipeMap<VariantMap>>

const createTagPipeline: PipelineFactory<AnyResolved, [ElementType | undefined], ElementType> = (
  resolved,
) => makeResolveTag(resolved.defaultTag)

const createPropsPipeline: PipelineFactory<AnyResolved, [AnyRecord], AnyRecord> =
  (resolved) => (props) =>
    mergeProps(resolved.defaultProps, props)

const createStylingClassPipeline: PipelineFactory<
  ClassPipelineOptions<VariantMap>,
  [ElementType, AnyRecord, ClassName | undefined, string | undefined],
  string
> = (resolved) => createClassPipeline(resolved)

const createAriaPipeline: PipelineFactory<
  AnyResolved,
  [ElementType, IntrinsicProps],
  { props: IntrinsicProps }
> = (resolved) => {
  const rules = [...new Set([...HTML_ARIA_RULES, ...(resolved.ariaRules ?? [])])]
  const engine = new AriaPolicyEngine(resolved.diagnostics, rules.length ? { rules } : undefined)
  return (tag, props) => engine.validate(tag, props)
}

const memoizedTagPipeline = definePipeline(createTagPipeline)
const memoizedPropsPipeline = definePipeline(createPropsPipeline)
const memoizedClassPipeline = definePipeline(createStylingClassPipeline)
const memoizedAriaPipeline = definePipeline(createAriaPipeline)

function resolveAriaPassthrough<P extends IntrinsicProps>(_tag: ElementType, props: P) {
  return { props }
}

function resolveClassPlugin(
  factory: ClassPluginFactory<AnyRecord> | undefined,
  resolved: ClassPipelineOptions<VariantMap>,
  diagnostics: AnyResolved['diagnostics'],
) {
  if (!factory) return { pluginResult: undefined, classPipeline: memoizedClassPipeline(resolved) }

  const pluginResult = factory(resolved, diagnostics)
  assertPluginShape(pluginResult)
  return { pluginResult, classPipeline: guardPipeline(pluginResult.pipeline) }
}

export function createPolymorphic2<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    ClassPluginFactory<AnyRecord> | undefined,
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
  const resolved = Object.freeze({ ...baseResolved, htmlPropNormalizersFn: getHtmlPropNormalizers })
  // Cast to the module-level pipelines' shared, non-generic resolved shape — same relationship
  // as createClassPipeline's ClassPipelineOptions<VariantMap> accepting any concrete VariantMap.
  const anyResolved = resolved as unknown as AnyResolved

  if (process.env.NODE_ENV !== 'production') {
    validateFactoryOptions(resolved, resolved.diagnostics)
  }

  const { pluginResult, classPipeline } = resolveClassPlugin(
    options.styling?.plugin as ClassPluginFactory<AnyRecord> | undefined,
    anyResolved,
    resolved.diagnostics,
  )
  const resolveTag = memoizedTagPipeline(anyResolved)
  const resolveProps = memoizedPropsPipeline(anyResolved)
  const resolveAriaFn =
    options.enforcement !== undefined ? memoizedAriaPipeline(anyResolved) : resolveAriaPassthrough

  const methods = {
    resolveTag,

    resolveProps,

    resolveClasses(tag: ElementType, props: AnyRecord, className?: ClassName, recipe?: string) {
      if (process.env.NODE_ENV !== 'production') {
        validateRenderProps(resolved.diagnostics, resolved, props, recipe)
      }
      return classPipeline(tag, props, className, recipe)
    },

    resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P) {
      return resolveAriaFn(tag, props) as { props: P }
    },
  }

  const runtimeObject = pluginResult
    ? { ...methods, options: resolved, hasStyling: true as const, classPlugin: pluginResult }
    : { ...methods, options: resolved }

  return runtimeObject as unknown as PolymorphicRuntime<
    TDefault,
    Props,
    Variants,
    Extract<keyof TPreset, string>,
    TPreset,
    PluginInstance<TPlugin>
  >
}
