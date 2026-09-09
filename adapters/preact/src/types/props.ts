import type { ClassName, ElementType } from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { UnknownProps } from './primitives'

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
      recipe?: string
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>
