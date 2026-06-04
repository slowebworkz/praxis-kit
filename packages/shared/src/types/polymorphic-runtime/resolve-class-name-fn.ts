import type { ClassName, ElementType } from '../primitives'
import type { AnyRecord } from '../primitives/any-record'

export type ResolveClassNameFn<Props extends AnyRecord, TSlot extends string = never> = (
  tag: ElementType,
  props: Props,
  className?: ClassName,
  variantKey?: TSlot,
) => string
