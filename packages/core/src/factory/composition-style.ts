import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { isFunction, isObject, isUndefined } from '@praxis-kit/guards'
import { composePipelines } from '@praxis-kit/pipeline-kit'
import type {
  ClassPipelineFn,
  ClassPipelineOptions,
  CompositionClassResolver,
  CompositionStyleContract,
  CompositionStyleOptions,
  VariantMap,
} from '@praxis-kit/styling'
import { mergeCompositionClassPipelineOptions } from '@praxis-kit/styling'
import type {
  AnyClassPluginFactory,
  ClassPluginResolution,
  ComposeOptions,
  CompositionDiagnostic,
  CompositionResolverOptions,
  ResolvedCompositionResolverOptions,
  ResolvedFactoryShape,
  RetainedCompositionStyleMetadata,
} from '../types'
import { resolveClassPlugin } from './pipelines/styling'

export type { RetainedCompositionStyleMetadata }

/** Shared runtime key for styling metadata owned by a generated Praxis component. */
export const COMPOSITION_STYLE_METADATA = Symbol.for('@praxis-kit/composition-style-metadata')

/**
 * Construct a composition pipeline from merged styling options through the same plugin
 * validation and pipeline-guarding boundary used by ordinary component construction.
 *
 * The caller is responsible for selecting the single factory according to composition policy;
 * this function deliberately does not inspect component metadata or combine plugin factories.
 * `factory` is `undefined` when no plugin was selected, in which case `resolveClassPlugin`
 * returns the ordinary class pipeline.
 */
export function createSelectedCompositionClassPipeline(
  options: CompositionStyleOptions,
  factory: AnyClassPluginFactory,
  diagnostics: ResolvedFactoryShape['diagnostics'],
): ClassPluginResolution {
  const merged: ClassPipelineOptions<VariantMap> = mergeCompositionClassPipelineOptions(options)
  return resolveClassPlugin(factory, merged, diagnostics)
}

/** Return retained styling metadata only for components created by a Praxis adapter. */
export function getCompositionStyleMetadata(
  value: unknown,
): RetainedCompositionStyleMetadata | undefined {
  if (!isObject(value) && !isFunction(value)) return undefined
  return (value as { [COMPOSITION_STYLE_METADATA]?: RetainedCompositionStyleMetadata })[
    COMPOSITION_STYLE_METADATA
  ]
}

export function createCompositionStyleResolver(
  primary: RetainedCompositionStyleMetadata,
  partner: RetainedCompositionStyleMetadata,
  composeDefaults?: object,
  onDiagnostic?: CompositionDiagnostic,
  onPluginConflict?: CompositionDiagnostic,
  diagnostics?: ResolvedFactoryShape['diagnostics'],
): CompositionClassResolver {
  const defaults = composeDefaults
    ? (Object.fromEntries(
        Object.keys(partner.variants ?? {})
          .filter((name) => Object.hasOwn(composeDefaults, name))
          .map((name) => [name, Reflect.get(composeDefaults, name)]),
      ) satisfies NonNullable<CompositionStyleContract['defaultVariants']>)
    : {}

  const primaryFactory = primary.pluginFactory
  const partnerFactory = partner.pluginFactory
  const selectedFactory = primaryFactory ?? partnerFactory

  if (primaryFactory && partnerFactory && primaryFactory !== partnerFactory) {
    onPluginConflict?.(
      'Both the primary component and its composed partner define different class-plugin factories; the primary factory is used for composition.',
    )
  }

  const { classPipeline, pluginResult } = createSelectedCompositionClassPipeline(
    {
      primary,
      partner,
      composeDefaults: defaults,
      ...(onDiagnostic && { onDiagnostic }),
    },
    selectedFactory,
    diagnostics ?? silentDiagnostics,
  )

  // A plugin-derived pipeline is typed by its argument tuple (`tag: ElementType`), while
  // `ClassPipelineFn` takes the looser `tag: unknown`; see `ClassPluginResolution`. The two are
  // compatible at runtime, so bridge the declared parameter type here.
  return Object.assign(classPipeline as ClassPipelineFn, {
    partner,
    ownedKeys: pluginResult?.ownedKeys ?? new Set<string>(),
  })
}

const resolvePartner = (
  options: CompositionResolverOptions,
): ResolvedCompositionResolverOptions => ({
  ...options,
  partner: isUndefined(options.compose?.with)
    ? undefined
    : getCompositionStyleMetadata(options.compose.with),
})

const buildOptionalResolver = ({
  primary,
  compose,
  partner,
  onDiagnostic,
  onPluginConflict,
  diagnostics,
}: ResolvedCompositionResolverOptions): CompositionClassResolver | undefined => {
  if (isUndefined(compose?.with) || isUndefined(partner)) return undefined
  return createCompositionStyleResolver(
    primary as RetainedCompositionStyleMetadata,
    partner,
    compose.defaults,
    onDiagnostic,
    onPluginConflict,
    diagnostics,
  )
}

const optionalCompositionStylePipeline = composePipelines(resolvePartner, buildOptionalResolver)

/**
 * Construct the optional composition styling pipeline from explicit retained contract metadata.
 * This lives beside the core runtime so adapters receive the already-resolved capability instead
 * of independently deciding whether or how composition styling is activated.
 */
export function createOptionalCompositionStyleResolver(
  primary: CompositionStyleContract,
  compose: ComposeOptions | undefined,
  onDiagnostic?: CompositionDiagnostic,
  onPluginConflict?: CompositionDiagnostic,
  primaryPluginFactory?: AnyClassPluginFactory,
  diagnostics?: ResolvedFactoryShape['diagnostics'],
): CompositionClassResolver | undefined {
  return optionalCompositionStylePipeline({
    primary: { ...primary, ...(primaryPluginFactory && { pluginFactory: primaryPluginFactory }) },
    ...(compose && { compose }),
    ...(onDiagnostic && { onDiagnostic }),
    ...(onPluginConflict && { onPluginConflict }),
    ...(diagnostics && { diagnostics }),
  })
}
