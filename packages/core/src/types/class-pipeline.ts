import type { AnyRecord, ClassName } from './primitives'

/**
 * The resolved class-computation function produced by `createClassPipeline`.
 *
 * Accepts the rendered tag, the merged prop object, an optional caller-supplied
 * class override, and an optional preset key. Returns the final combined class
 * string — base class, tag-map class, variant class, and caller class merged.
 *
 * `variantKey` selects a named preset from `presetMap`, applying its variant
 * selections before any prop-level overrides.
 */
export type ClassPipelineFn = (
  tag: unknown,
  props: AnyRecord,
  className?: ClassName,
  variantKey?: string,
) => string
