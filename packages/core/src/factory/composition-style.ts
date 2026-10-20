import { isFunction, isObject } from '@praxis-kit/guards'
import type { CompositionClassResolver, CompositionStyleContract } from '@praxis-kit/styling'
import { createCompositionClassPipeline } from '@praxis-kit/styling'
import { composePipelines } from '@praxis-kit/pipeline-kit'
import type { ComposeOptions } from '../types'

/** Shared runtime key for styling metadata owned by a generated Praxis component. */
export const COMPOSITION_STYLE_METADATA = Symbol.for('@praxis-kit/composition-style-metadata')

type CompositionDiagnostic = (message: string) => void

type ResolverOptions = {
  readonly primary: CompositionStyleContract
  readonly compose?: ComposeOptions
  readonly onDiagnostic?: CompositionDiagnostic
}

type ResolvedResolverOptions = ResolverOptions & {
  readonly partner: CompositionStyleContract | undefined
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
    createCompositionClassPipeline({
      primary,
      partner,
      composeDefaults: defaults,
      ...(onDiagnostic && { onDiagnostic }),
    }),
    { partner },
  )
}

const resolvePartner = (options: ResolverOptions): ResolvedResolverOptions => ({
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
}: ResolvedResolverOptions): CompositionClassResolver | undefined => {
  if (compose?.with === undefined || partner === undefined) return undefined
  return createCompositionStyleResolver(primary, partner, compose.defaults, onDiagnostic)
}

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
  const pipeline = composePipelines(resolvePartner, buildOptionalResolver)
  return pipeline({ primary, ...(compose && { compose }), ...(onDiagnostic && { onDiagnostic }) })
}
