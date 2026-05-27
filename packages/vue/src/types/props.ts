import type { ClassName, ElementType } from '@praxis-ui/core'
import type { UnknownProps, VariantKey } from './primitives'

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
    variantKey?: VariantKey
    children?: never
  } & AsProp &
    AsChildProp &
    UnknownProps
>
