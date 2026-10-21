import { isDefined, isFunction, isObject } from '@praxis-kit/guards'
import type {
  AnyRecord,
  ClassName,
  ClassPipelineFn,
  ClassPipelineOptions,
  VariantMap,
} from '@praxis-kit/styling'
import {
  COMPOSITION_STYLE_METADATA,
  createCompositionStyleResolver as createCoreCompositionStyleResolver,
  createOptionalCompositionStyleResolver,
  getCompositionStyleMetadata,
} from '@praxis-kit/core/internal/composition-style'
import type { AnyClassPluginFactory, ComposeOptions } from '@praxis-kit/core'
import type {
  CompositionClassResolver,
  CompositionStyleRequest,
  OptionalCompositionStylePipelineOptions,
  StyleMetadata,
} from './types'

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
  pluginFactory?: AnyClassPluginFactory,
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
    ...(pluginFactory && { pluginFactory }),
  } satisfies StyleMetadata

  Object.defineProperty(component, COMPOSITION_STYLE_METADATA, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: metadata,
  })

  return component
}

// Metadata lookup lives in `@praxis-kit/core` so the key and reader have a single definition.
export { getCompositionStyleMetadata }

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
  return createCoreCompositionStyleResolver(primary, partner, composeDefaults, onDiagnostic)
}

/**
 * Shared adapter-facing wrapper around the core optional composition pipeline. The actual
 * construction and activation policy lives in `@praxis-kit/core`; this module retains metadata
 * attachment and adapter-specific prop shaping only.
 */
export function createOptionalCompositionStylePipeline(
  options: OptionalCompositionStylePipelineOptions,
): CompositionClassResolver | undefined {
  const compose =
    options.with === undefined
      ? undefined
      : {
          with: options.with as ComposeOptions['with'],
          ...(options.composeDefaults !== undefined && { defaults: options.composeDefaults }),
        }
  return createOptionalCompositionStyleResolver(
    options.primary,
    compose,
    options.onDiagnostic,
    options.onPluginConflict,
    options.primary.pluginFactory,
  )
}

/**
 * Copy one explicitly selected variant value. An absent or `undefined` value is not a selection:
 * copying it would pin the variant to `undefined` and shadow recipe values and defaults, and
 * `Object.hasOwn` alone can't be trusted for it because a dynamic props proxy (Solid's spread of
 * a computed object) reports keys that were never set.
 */
function copySelectedVariant(target: AnyRecord, source: Readonly<AnyRecord>, name: string): void {
  if (Object.hasOwn(source, name) && source[name] !== undefined) target[name] = source[name]
}

/**
 * Props for the combined resolver: partner props minus unforwarded `compose.defaults`, plus
 * explicit variant selections declared by either contract. Other primary props must not leak into
 * partner variant or compound resolution when `allProps` is disabled.
 */
export function composeStyleProps(
  partnerProps: Readonly<AnyRecord>,
  componentProps: Readonly<AnyRecord>,
  primary: StyleMetadata,
  composeDefaults: object | undefined,
  partner: StyleMetadata,
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
  // A declared variant carried as `undefined` (forwarded from the partner's props) is not a
  // selection either: left in place it would pin the variant and shadow recipe values and
  // defaults, so drop it before the defined selections are applied.
  const declaredVariants = [
    ...Object.keys(partner.variants ?? {}),
    ...Object.keys(primary.variants ?? {}),
  ]
  for (const name of declaredVariants) {
    if (result[name] === undefined) delete result[name]
  }
  // Partner-only variant props are styling inputs even when `allProps` is false; raw props
  // remain unforwarded, but the shared resolver must still see the combined variant selection.
  for (const name of Object.keys(partner.variants ?? {})) {
    copySelectedVariant(result, componentProps, name)
  }
  // Primary values win incompatible collisions, matching the resolver's primary-wins policy.
  for (const name of Object.keys(primary.variants ?? {})) {
    copySelectedVariant(result, componentProps, name)
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
