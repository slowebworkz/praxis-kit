import { Fragment } from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export type SlottableProps = PropsWithChildren
export function Slottable({ children }: SlottableProps): ReactElement {
  return <Fragment>{children}</Fragment>
}
