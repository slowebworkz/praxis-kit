import type { ClassPipelineFn, ClassPipelineOptions, VariantMap } from './types'
import { cn } from '@praxis-kit/primitive'
import { cva } from './cva'
import { StaticClassResolver } from './static-class-resolver'
import { VariantClassResolver } from './variant-class-resolver'

export function createClassPipeline<TVariants extends VariantMap = VariantMap>(
  resolved: ClassPipelineOptions<TVariants>,
): ClassPipelineFn {
  const baseClass = resolved.baseClassName ?? ''

  // `as never` bridges the variance gap between the generic V and cva()'s internal overloads.
  const cvaFn = resolved.variants
    ? cva('', {
        variants: resolved.variants as never,
        defaultVariants: resolved.defaultVariants as never,
        compoundVariants: resolved.compoundVariants as never,
      })
    : null

  const variantKeys = resolved.variants ? new Set(Object.keys(resolved.variants)) : undefined
  const staticResolver = new StaticClassResolver(baseClass, resolved.tagMap)
  const variantResolver = new VariantClassResolver(
    cvaFn,
    resolved.presetMap,
    variantKeys,
    resolved.precomputedClasses,
  )

  return function resolveClasses(tag, props, className, variantKey) {
    const staticClasses = staticResolver.resolve(tag, variantKey !== undefined)
    const variantClasses = variantResolver.resolve({ props, variantKey })
    // Fast path: no caller className — both resolver results are already cached strings.
    if (!className)
      return staticClasses && variantClasses
        ? `${staticClasses} ${variantClasses}`
        : staticClasses || variantClasses
    return cn(staticClasses, variantClasses, className)
  }
}
