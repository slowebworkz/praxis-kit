import type { ClassName, ElementType } from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { UnknownProps } from './primitives'

export type AsProp<T extends ElementType = ElementType> = Readonly<{
  as?: T
}>

export type PolymorphicPropsBase = Readonly<
  Simplify<
    {
      asChild?: boolean
      children?: unknown
      class?: ClassName
      recipe?: string
      ref?: unknown
    } & AsProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>
