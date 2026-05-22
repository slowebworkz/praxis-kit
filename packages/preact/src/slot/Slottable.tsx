import { Fragment } from 'preact'
import type { ComponentChildren } from 'preact'
import type { AnyVNode } from '../types/primitives'

export type SlottableProps = { children?: ComponentChildren }

export function Slottable({ children }: SlottableProps): AnyVNode {
  return <Fragment>{children}</Fragment>
}
