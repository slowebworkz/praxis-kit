import { isValidElement } from 'preact'
import type { VNode } from 'preact'
import type { AnyVNode } from '../types'
import { EVENT_HANDLER_RE } from './constants'
import { isFunction, isRecord } from '@praxis-kit/primitive'
import { Slottable } from './Slottable'
import type { SlottableProps } from './Slottable'

export { isFunction, isRecord as isPlainObject }

export function isSlottableElement(value: unknown): value is VNode<SlottableProps> {
  return isValidElement(value) && (value as AnyVNode).type === Slottable
}

export function isReactEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}
