import { resolveFactoryOptions } from '../options'
import { resolveTag } from '../resolver'
import { createClassPipeline } from '../styles'
import type {
  AnyRecord,
  ElementType,
  FactoryOptions,
  PolymorphicRuntime,
  VariantMap,
  VariantProps,
} from '../types'
import { mergeProps } from '../utils'

/**
 * Creates a `PolymorphicRuntime` from the given factory options.
 *
 * Normalizes options, instantiates the class pipeline (or the provided `classPlugin`),
 * and returns an immutable runtime object with `resolveTag`, `resolveProps`,
 * `resolveClasses`, and `options`. Framework adapters consume this runtime to
 * drive rendering and validation.
 */
export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset> = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  const resolved = resolveFactoryOptions(options)
  const plugin = options.classPlugin?.(resolved)
  const classPipeline = plugin?.pipeline ?? createClassPipeline(resolved)

  return {
    resolveTag<T extends ElementType>(as?: T): T | TDefault {
      return resolveTag(resolved.defaultTag, as) as T | TDefault
    },

    resolveProps<P extends AnyRecord>(props: P) {
      return mergeProps(resolved.defaultProps, props)
    },

    resolveClasses(tag, props, className, variantKey) {
      return classPipeline(tag, props, className, variantKey)
    },

    options: resolved,
    ...(plugin !== undefined && { classPlugin: plugin }),
  }
}
