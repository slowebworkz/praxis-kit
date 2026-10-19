import { isDefined, isFunction, isObject } from '@praxis-kit/guards'
import type { RuntimeOptions, StyleMetadata } from './types'

/** Shared runtime key for styling metadata owned by a generated Praxis component. */
const COMPOSITION_STYLE_METADATA = Symbol.for('@praxis-kit/composition-style-metadata')

/**
 * Retain only standard styling fields on a generated component so a direct `compose.with`
 * target can expose its Praxis styling contract without relying on type-only markers or
 * inspecting framework-specific component internals.
 *
 * Per-contract precomputed classes are deliberately excluded: they cannot represent the
 * combined result of a composition.
 */
export function attachCompositionStyleMetadata<T extends object>(
  component: T,
  options: RuntimeOptions,
): T {
  const metadata = {
    ...(isDefined(options.baseClassName) && { baseClassName: options.baseClassName }),
    ...(isDefined(options.variants) && { variants: options.variants }),
    ...(isDefined(options.defaultVariants) && { defaultVariants: options.defaultVariants }),
    ...(isDefined(options.compoundVariants) && { compoundVariants: options.compoundVariants }),
    ...(isDefined(options.recipeMap) && { recipeMap: options.recipeMap }),
    ...(isDefined(options.tagMap) && { tagMap: options.tagMap }),
  } satisfies StyleMetadata

  Object.defineProperty(component, COMPOSITION_STYLE_METADATA, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: metadata,
  })

  return component
}

/** Return retained styling metadata only for components created by a Praxis adapter. */
export function getCompositionStyleMetadata(value: unknown): StyleMetadata | undefined {
  if (!isObject(value) && !isFunction(value)) {
    return undefined
  }

  return (value as { [COMPOSITION_STYLE_METADATA]?: StyleMetadata })[COMPOSITION_STYLE_METADATA]
}
