import type { ClassName, ElementType, AnyRecord } from '../primitives'

export type ResolveClassNameFn<Props extends AnyRecord, TSlot extends string = never> = (
  tag: ElementType,
  props: Props,
  className?: ClassName,
  recipe?: TSlot,
) => string | undefined
