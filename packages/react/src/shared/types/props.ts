import type { ClassName, ElementType } from '@praxis-ui/core'
import type { ReactElement } from 'react'
import type { Simplify } from 'type-fest'
import type { UnknownProps } from './primitives'

/**
 * Props passed to the `render` callback — the component's resolved className,
 * filtered own props, and ref. Spread these onto the target element.
 *
 * Typed loosely to accommodate any element tag the user chooses.
 */
export type RenderCallbackProps = Readonly<Record<string, unknown>>

export type RenderProp = Readonly<{
  render?: ((props: RenderCallbackProps) => ReactElement) | undefined
}>

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
      variantKey?: string
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & RenderProp & UnknownProps>
