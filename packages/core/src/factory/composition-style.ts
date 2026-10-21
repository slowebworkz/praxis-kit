import { isFunction, isObject } from '@praxis-kit/guards'
import { composePipelines } from '@praxis-kit/pipeline-kit'
import type {
  ClassPipelineOptions,
  CompositionClassResolver,
  CompositionStyleContract,
  CompositionStyleOptions,
  VariantMap,
} from '@praxis-kit/styling'
import {
  createCompositionClassPipeline as createDefaultCompositionClassPipeline,
  mergeCompositionClassPipelineOptions,
} from '@praxis-kit/styling'
import type {
  AnyClassPluginFactory,
  ClassPluginResolution,
  ComposeOptions,
  CompositionDiagnostic,
  CompositionResolverOptions,
  ResolvedCompositionResolverOptions,
  ResolvedFactoryShape,
} from '../types'
import { resolveClassPlugin } from './pipelines/styling'

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
export function getCompositionStyleMetadata(value: unknown): CompositionStyleContract | undefined {
  if (!isObject(value) && !isFunction(value)) return undefined
  return (value as { [COMPOSITION_STYLE_METADATA]?: CompositionStyleContract })[
    COMPOSITION_STYLE_METADATA
  ]
}

export function createCompositionStyleResolver(
  primary: CompositionStyleContract,
  partner: CompositionStyleContract,
  composeDefaults?: object,
  onDiagnostic?: CompositionDiagnostic,
): CompositionClassResolver {
  const defaults = composeDefaults
    ? (Object.fromEntries(
        Object.keys(partner.variants ?? {})
          .filter((name) => Object.hasOwn(composeDefaults, name))
          .map((name) => [name, Reflect.get(composeDefaults, name)]),
      ) satisfies NonNullable<CompositionStyleContract['defaultVariants']>)
    : {}

  return Object.assign(
    createDefaultCompositionClassPipeline({
      primary,
      partner,
      composeDefaults: defaults,
      ...(onDiagnostic && { onDiagnostic }),
    }),
    { partner },
  )
}

const resolvePartner = (
  options: CompositionResolverOptions,
): ResolvedCompositionResolverOptions => ({
  ...options,
  partner:
    options.compose?.with === undefined
      ? undefined
      : getCompositionStyleMetadata(options.compose.with),
})

const buildOptionalResolver = ({
  primary,
  compose,
  partner,
  onDiagnostic,
}: ResolvedCompositionResolverOptions): CompositionClassResolver | undefined => {
  if (compose?.with === undefined || partner === undefined) return undefined
  return createCompositionStyleResolver(primary, partner, compose.defaults, onDiagnostic)
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
): CompositionClassResolver | undefined {
  return optionalCompositionStylePipeline({
    primary,
    ...(compose && { compose }),
    ...(onDiagnostic && { onDiagnostic }),
  })
}
