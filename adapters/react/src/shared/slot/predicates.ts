import { EVENT_HANDLER_RE } from './constants'
import { isFunction, isRecord } from '@praxis-kit/primitive'
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { Slottable } from './Slottable'
import type { SlottableProps } from './Slottable'

export { isFunction, isRecord as isPlainObject }

export function isSlottableElement(value: unknown): value is ReactElement<SlottableProps> {
  return isValidElement(value) && value.type === Slottable
}

export function isReactEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}
