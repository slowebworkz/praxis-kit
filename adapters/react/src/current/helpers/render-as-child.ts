import { isValidElement } from 'react'
import type { ReactElement, Ref } from 'react'
import { cloneSlotChild } from '../slot/cloneSlotChild'

export function renderAsChild(
  children: unknown,
  className?: string,
  ref?: Ref<unknown>,
): ReactElement {
  if (!isValidElement(children)) throw new Error('asChild requires a React element child')
  const child = children as ReactElement
  const slotProps: Record<string, unknown> = {}
  if (className) slotProps.className = className
  return cloneSlotChild({ child, slotProps, ref: ref ?? null })
}
