import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { AriaEngine } from './aria-engine'
import type { AriaRule } from './aria-rule'
import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { PropNormalizer } from './factory-options'
import type { VariantMap } from '@praxis-kit/primitive/types'

type CreateClassPipeline = <TVariants extends VariantMap>(
  opts: ClassPipelineOptions<TVariants>,
) => ClassPipelineFn

type AriaEngineConstructor = new (
  diagnostics: Diagnostics,
  options?: { rules?: readonly AriaRule[] },
) => AriaEngine

export type Capabilities = {
  readonly createClassPipeline?: CreateClassPipeline
  readonly AriaEngine?: AriaEngineConstructor
  readonly htmlAriaRules?: readonly AriaRule[]
  readonly htmlPropNormalizersFn?: (tag: unknown) => readonly PropNormalizer[] | undefined
}
