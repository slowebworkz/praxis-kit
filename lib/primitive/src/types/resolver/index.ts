import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { AnyRecord, ClassName, ElementType } from '../primitives'

export type ResolverOptions = {
  defaultTag: ElementType
  defaultProps?: AnyRecord
  diagnostics?: Diagnostics
  allowedAs?: readonly ElementType[]
  displayName?: string
}

export type ResolveInput<
  Props extends AnyRecord = AnyRecord,
  TSlot extends string = string,
  Children = unknown,
> = {
  as?: ElementType
  props: Props
  className?: ClassName
  recipe?: TSlot
  children?: Children
}

export type ResolveOutput<Props extends AnyRecord = AnyRecord, Children = unknown> = {
  tag: ElementType
  props: Props
  className: ClassName | undefined
  children?: Children
}
