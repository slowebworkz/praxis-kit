import type { AnyRecord, ClassName } from './primitives'

/**
 * The resolved class-computation function produced by `createClassPipeline`.
 *
 * Accepts the rendered tag, the merged prop object, an optional caller-supplied
 * class override, and an optional preset key. Returns the final combined class
 * string — base class, tag-map class, variant class, and caller class merged.
 *
 * `recipe` selects a named preset from `recipeMap`, applying its variant
 * selections before any prop-level overrides.
 */
export type ClassPipelineFn = (
  tag: unknown,
  props: AnyRecord,
  className?: ClassName,
  recipe?: string,
) => string
