import type { AnyRecord, ClassName } from '../primitives'

export type ClassPipelineFn = (
  tag: unknown,
  props: AnyRecord,
  className?: ClassName,
  recipe?: string,
) => string
