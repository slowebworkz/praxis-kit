import type { ClassPipelineFn, ClassPipelineOptions, VariantMap } from '../types'
export type { ClassPipelineFn } from '../types'
import { cn } from '../utils'
import { cva } from './cva'
import { StaticClassResolver } from './static-class-resolver'
import { VariantClassResolver } from './variant-class-resolver'

export function createClassPipeline<TVariants extends VariantMap = VariantMap>(
  resolved: ClassPipelineOptions<TVariants>,
): ClassPipelineFn {
  const baseClass = resolved.baseClassName ?? ''

  const cvaFn = resolved.variants
    ? cva('', {
        variants: resolved.variants as never,
        defaultVariants: resolved.defaultVariants as never,
        compoundVariants: resolved.compoundVariants as never,
      })
    : null

  const staticResolver = new StaticClassResolver(baseClass, resolved.tagMap)
  const variantResolver = new VariantClassResolver(cvaFn, resolved.presetMap)

  return function resolveClasses(tag, props, className, variantKey) {
    const staticClasses = staticResolver.resolve(tag, variantKey !== undefined)
    const variantClasses = variantResolver.resolve({ props, variantKey })
    return cn(staticClasses, variantClasses, className)
  }
}
