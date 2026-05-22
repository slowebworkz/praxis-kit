import type { ClassName, ElementType } from '@polymorphic-ui/core'
import type { Simplify } from 'type-fest'
import type { UnknownProps, VariantKey } from './primitives'

export type AsProp<T extends ElementType = ElementType> = Readonly<{
  as?: T
}>

export type AsChildProp = Readonly<{
  asChild?: boolean
}>

export type PolymorphicPropsBase = Readonly<
  Simplify<
    {
      children?: unknown
      className?: ClassName
      variantKey?: VariantKey
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>
