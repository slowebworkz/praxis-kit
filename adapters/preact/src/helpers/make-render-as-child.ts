import { isValidElement } from 'preact'
import type { Ref } from 'preact'
import type { AnyRecord } from '@praxis-kit/core'
import type { CloneSlotChildFn } from '../slot/types'
import type { AnyVNode } from '../types'

export function makeRenderAsChild(cloneSlotChild: CloneSlotChildFn) {
  return function renderAsChild(
    children: unknown,
    className?: string,
    ref?: Ref<unknown> | null,
  ): AnyVNode {
    if (!isValidElement(children)) throw new Error('asChild requires a Preact element child')
    const slotProps: AnyRecord = className ? { className } : {}
    return cloneSlotChild({ child: children, slotProps, ref: ref ?? null })
  }
}
