import { isDefined, isFunction, isObject } from '@praxis-kit/guards'
import type {
  AnyRecord,
  ClassName,
  ClassPipelineFn,
  ClassPipelineOptions,
  VariantMap,
} from '@praxis-kit/styling'
import { createCompositionClassPipeline } from '@praxis-kit/styling'
import { composePipelines } from '@praxis-kit/pipeline-kit'
import type { Pipeline, PipelineFactory, PipelineStage } from '@praxis-kit/pipeline-kit'
import type {
  CompositionStyleRequest,
  OptionalCompositionStylePipelineOptions,
  ResolvedOptionalCompositionStylePipelineOptions,
  StyleMetadata,
} from './types'

/** Shared runtime key for styling metadata owned by a generated Praxis component. */
const COMPOSITION_STYLE_METADATA = Symbol.for('@praxis-kit/composition-style-metadata')

/** Internal prop used only to pass the combined resolver through automatic adapter composition. */
export const COMPOSITION_STYLE_REQUEST_PROP = '__praxisCompositionStyleRequest'

/** Validate the internal composition request before trusting a prop value at runtime. */
export function isCompositionStyleRequest(value: unknown): value is CompositionStyleRequest {
  return isObject(value, true) && isFunction(value.resolveClasses)
}

/**
 * Retain only standard styling fields on a generated component so a direct `compose.with`
 * target can expose its Praxis styling contract without relying on type-only markers or
 * inspecting framework-specific component internals.
 *
 * Per-contract precomputed classes are deliberately excluded: they cannot represent the
 * combined result of a composition.
 */
export function attachCompositionStyleMetadata<T extends object, V extends VariantMap>(
  component: T,
  options: ClassPipelineOptions<V>,
): T {
  // Preserve the caller's concrete variant type at the API boundary; metadata is stored in the
  // shared, erased representation because composition resolves it dynamically at runtime.
  const styleOptions = options as StyleMetadata
  const metadata = {
    ...(isDefined(styleOptions.baseClassName) && { baseClassName: styleOptions.baseClassName }),
    ...(isDefined(styleOptions.variants) && { variants: styleOptions.variants }),
    ...(isDefined(styleOptions.defaultVariants) && {
      defaultVariants: styleOptions.defaultVariants,
    }),
    ...(isDefined(styleOptions.compoundVariants) && {
      compoundVariants: styleOptions.compoundVariants,
    }),
    ...(isDefined(styleOptions.recipeMap) && { recipeMap: styleOptions.recipeMap }),
    ...(isDefined(styleOptions.tagMap) && { tagMap: styleOptions.tagMap }),
  } satisfies StyleMetadata

  Object.defineProperty(component, COMPOSITION_STYLE_METADATA, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: metadata,
  })

  return component
}

/** Return retained styling metadata only for components created by a Praxis adapter. */
export function getCompositionStyleMetadata(value: unknown): StyleMetadata | undefined {
  if (!isObject(value) && !isFunction(value)) {
    return undefined
  }

  return (value as { [COMPOSITION_STYLE_METADATA]?: StyleMetadata })[COMPOSITION_STYLE_METADATA]
}

/**
 * Build the shared resolver for a primary component and its direct Praxis partner.
 * Only variant keys declared by the partner are accepted from `compose.defaults`; ordinary
 * props remain the partner component's concern and are not mistaken for variant defaults.
 */
export function createCompositionStyleResolver(
  primary: StyleMetadata,
  partner: StyleMetadata,
  composeDefaults?: object,
  onDiagnostic?: (message: string) => void,
): ClassPipelineFn {
  const variantDefaults = composeDefaults
    ? (Object.fromEntries(
        Object.keys(partner.variants ?? {})
          .filter((name) => Object.hasOwn(composeDefaults, name))
          .map((name) => [name, Reflect.get(composeDefaults, name)]),
      ) satisfies NonNullable<StyleMetadata['defaultVariants']>)
    : {}

  return createCompositionClassPipeline({
    primary,
    partner,
    composeDefaults: variantDefaults,
    ...(onDiagnostic && { onDiagnostic }),
  })
}

const resolveCompositionPartner: Pipeline<
  [OptionalCompositionStylePipelineOptions],
  ResolvedOptionalCompositionStylePipelineOptions
> = (options) => ({
  ...options,
  partner: options.with === undefined ? undefined : getCompositionStyleMetadata(options.with),
})

const buildOptionalCompositionResolver: PipelineStage<
  ResolvedOptionalCompositionStylePipelineOptions,
  ClassPipelineFn | undefined
> = ({ primary, partner, composeDefaults, onDiagnostic }) =>
  partner
    ? createCompositionStyleResolver(primary, partner, composeDefaults, onDiagnostic)
    : undefined

/**
 * Construct the optional composition styling pipeline through pipeline-kit. `compose.with` is
 * the activation switch; a target without retained Praxis styling metadata falls back to the
 * adapter's existing nested-render behavior. This factory is intentionally shared by adapters so
 * they don't each implement composition-pipeline selection independently.
 */
const createOptionalCompositionPipeline: PipelineFactory<
  OptionalCompositionStylePipelineOptions,
  [],
  ClassPipelineFn | undefined
> = (options) =>
  composePipelines(() => resolveCompositionPartner(options), buildOptionalCompositionResolver)

export function createOptionalCompositionStylePipeline(
  options: OptionalCompositionStylePipelineOptions,
): ClassPipelineFn | undefined {
  return createOptionalCompositionPipeline(options)()
}

/**
 * Props for the combined resolver: the partner's props minus unforwarded `compose.defaults`, plus
 * only the primary's own variant props. Other primary props must not leak into the partner's variant
 * or compound resolution when `allProps` is disabled.
 */
export function composeStyleProps(
  partnerProps: Readonly<AnyRecord>,
  componentProps: Readonly<AnyRecord>,
  primary: StyleMetadata,
  composeDefaults?: object,
): AnyRecord {
  const result: AnyRecord = { ...partnerProps }
  // `compose.defaults` reach the resolver through `createCompositionStyleResolver` at the lowest
  // precedence; left in the props they would read as explicit values and override the primary's
  // own defaults.
  if (composeDefaults) {
    for (const name of Object.keys(composeDefaults)) {
      if (
        result[name] === Reflect.get(composeDefaults, name) &&
        componentProps[name] !== result[name]
      ) {
        delete result[name]
      }
    }
  }
  for (const name of Object.keys(primary.variants ?? {})) {
    if (Object.hasOwn(componentProps, name)) result[name] = componentProps[name]
  }
  return result
}

/**
 * Merge caller class names in partner-then-primary order. Avoid duplicating the same value when
 * `allProps` forwards the primary className unchanged to the partner.
 */
export function mergeCompositionClassNames(
  partnerClassName: ClassName | undefined,
  primaryClassName: ClassName | undefined,
): ClassName | undefined {
  if (partnerClassName === primaryClassName) return primaryClassName

  const values = [partnerClassName, primaryClassName].flatMap((value) =>
    Array.isArray(value) ? value : value === undefined ? [] : [value],
  )
  const result = values.filter(Boolean).join(' ')
  return result || undefined
}
