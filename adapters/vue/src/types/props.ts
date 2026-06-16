import type { ClassName, ElementType } from '@praxis-kit/core'
import type { UnknownProps } from './primitives'

export type AsProp<T extends ElementType = ElementType> = Readonly<{
  as?: T
}>

export type AsChildProp = Readonly<{
  asChild?: boolean
}>

/** Props extracted from Vue attrs before the remainder is forwarded to core. */
export type KnownProps = Readonly<
  {
    class?: ClassName
    variantKey?: string
    children?: never
  } & AsProp &
    AsChildProp &
    UnknownProps
>
