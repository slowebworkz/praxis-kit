import type { AnyRecord } from '../primitives/any-record'
import type { ClassName } from '../primitives/class-name'

export type ClassPipelineFn = (
  tag: unknown,
  props: AnyRecord,
  className?: ClassName,
  variantKey?: string,
) => string
