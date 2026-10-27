import { isDefined, isFunction, isObject, isUndefined } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
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
  const compose = isUndefined(options.with)
    ? undefined
    : {
        with: options.with as ComposeOptions['with'],
        ...(isDefined(options.composeDefaults) && { defaults: options.composeDefaults }),
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
 * Copy one explicitly selected styling prop. An absent or `undefined` value is not a selection:
 * copying it would pin the variant to `undefined` and shadow recipe values and defaults, and
 * `Object.hasOwn` alone can't be trusted for it because a dynamic props proxy (Solid's spread of
 * a computed object) reports keys that were never set.
 */
function copySelectedProp(target: AnyRecord, source: Readonly<AnyRecord>, name: string): boolean {
  // `!isUndefined`, not `isDefined`: a `null` selection is copied as-is, matching the ordinary
  // (non-composed) path, where `null` is not treated as unset the way `undefined` is.
  if (!Object.hasOwn(source, name) || isUndefined(source[name])) return false
  target[name] = source[name]
  return true
}

/** Remove plugin-owned styling inputs before forwarding props to a child or host element. */
export function filterOwnedProps(
  props: object | undefined,
  ownedKeys: ReadonlySet<string>,
  omittedKeys: readonly string[] = [],
): AnyRecord {
  if (!props) return {}
  const result: AnyRecord = {}
  iterate.forEachEntry(props as AnyRecord, (key, value) => {
    if (!ownedKeys.has(key) && !omittedKeys.includes(key)) result[key] = value
  })
  return result
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
  compositionOwnedKeys: ReadonlySet<string> = new Set(),
  primaryResolvedProps: Readonly<AnyRecord> | undefined = {},
): AnyRecord {
  const result: AnyRecord = { ...partnerProps }
  // `compose.defaults` reach the resolver through `createCompositionStyleResolver` at the lowest
  // precedence; left in the props they would read as explicit values and override the primary's
  // own defaults.
  if (composeDefaults) {
    iterate.forEachEntry(composeDefaults as AnyRecord, (name, defaultValue) => {
      if (result[name] === defaultValue && componentProps[name] !== result[name]) {
        delete result[name]
      }
    })
  }
  // A declared variant carried as `undefined` (forwarded from the partner's props) is not a
  // selection either: left in place it would pin the variant and shadow recipe values and
  // defaults, so drop it before the defined selections are applied.
  const dropUndefinedSelection = (name: string): void => {
    if (isUndefined(result[name])) delete result[name]
  }
  iterate.forEachEntry(partner.variants ?? {}, dropUndefinedSelection)
  iterate.forEachEntry(primary.variants ?? {}, dropUndefinedSelection)
  // Partner-only variant props are styling inputs even when `allProps` is false; raw props
  // remain unforwarded, but the shared resolver must still see the combined variant selection.
  iterate.forEachEntry(partner.variants ?? {}, (name) => {
    copySelectedProp(result, componentProps, name)
  })
  // Primary values win incompatible collisions, matching the resolver's primary-wins policy.
  iterate.forEachEntry(primary.variants ?? {}, (name) => {
    copySelectedProp(result, componentProps, name)
  })
  // Plugin-owned styling props are inputs even when compose.allProps is false. Explicit primary
  // selections win, followed by the primary's fully resolved defaults/normalize output, then
  // compose.defaults. If none select a key, the partner's own defaults remain in effect.
  const ownedSources = [
    componentProps,
    primaryResolvedProps,
    composeDefaults as AnyRecord | undefined,
  ]
  iterate.forEachSet(compositionOwnedKeys, (name) => {
    for (const source of ownedSources) {
      if (source && copySelectedProp(result, source, name)) return
    }
  })
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
    Array.isArray(value) ? value : isUndefined(value) ? [] : [value],
  )
  const result = values.filter(Boolean).join(' ')
  return result || undefined
}
