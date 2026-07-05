import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { VariantMap } from '@praxis-kit/primitive'
import type { AriaEngine, AriaRule } from './aria'
import type { ClassPipelineFn, ClassPipelineOptions } from './class'
import type { PropNormalizer } from './factory'

type CreateClassPipeline = <TVariants extends VariantMap>(
  opts: ClassPipelineOptions<TVariants>,
) => ClassPipelineFn

type AriaEngineOptions = {
  readonly rules?: readonly AriaRule[]
}

type AriaEngineConstructor = new (
  diagnostics: Diagnostics,
  options?: AriaEngineOptions,
) => AriaEngine

/** A tag-keyed lookup returning the items applicable to that tag, or none. */
type Resolver<T> = (tag: unknown) => readonly T[] | undefined

export type Capabilities = {
  readonly createClassPipeline?: CreateClassPipeline
  readonly AriaEngine?: AriaEngineConstructor
  readonly htmlAriaRules?: readonly AriaRule[]
  readonly htmlPropNormalizersFn?: Resolver<PropNormalizer>
}
