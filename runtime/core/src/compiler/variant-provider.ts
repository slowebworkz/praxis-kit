import type { Pass, PipelineProvider, VariantMap } from '@pk2/pipeline'
import type { CompilerContext } from './types'
import { contributeVariants } from './passes'

export interface VariantProviderOptions {
  readonly variants?: VariantMap
  readonly name?: string
}

export const variantProvider: PipelineProvider<CompilerContext, VariantProviderOptions> = {
  create({ variants, name }: VariantProviderOptions): ReadonlyArray<Pass<CompilerContext>> {
    const pass = contributeVariants(variants, name)
    return pass !== undefined ? [pass] : []
  },
}
