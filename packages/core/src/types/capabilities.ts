import type { AriaEngine } from './aria-engine'
import type { AriaRule } from './aria-rule'
import type { ClassPipelineFn } from './class-pipeline'
import type { ClassPipelineOptions } from './class-pipeline-options'
import type { StrictMode } from './strict-mode'
import type { VariantMap } from './variant'

type CreateClassPipeline = <TVariants extends VariantMap>(
  opts: ClassPipelineOptions<TVariants>,
) => ClassPipelineFn

type AriaEngineConstructor = new (
  strict?: StrictMode,
  options?: { rules?: readonly AriaRule[] },
) => AriaEngine

export type Capabilities = {
  readonly createClassPipeline?: CreateClassPipeline
  readonly AriaEngine?: AriaEngineConstructor
}
