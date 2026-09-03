import { isValidElement } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@praxis-kit/core'
import type { CloneSlotChildFn } from './types'

export function makeRenderAsChild(cloneSlotChild: CloneSlotChildFn) {
  return function renderAsChild(
    children: unknown,
    className?: string,
    ref?: Ref<unknown> | null,
  ): ReactElement {
    if (!isValidElement(children)) throw new Error('asChild requires a React element child')
    const slotProps: AnyRecord = className ? { className } : {}
    return cloneSlotChild({ child: children, slotProps, ref: ref ?? null })
  }
}
