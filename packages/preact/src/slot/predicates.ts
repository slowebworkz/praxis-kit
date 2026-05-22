import { isValidElement } from 'preact'
import type { VNode } from 'preact'
import type { AnyVNode } from '../types/primitives'
import { EVENT_HANDLER_RE } from './constants'
import { Slottable } from './Slottable'
import type { SlottableProps } from './Slottable'

export function isSlottableElement(value: unknown): value is VNode<SlottableProps> {
  return isValidElement(value) && (value as AnyVNode).type === Slottable
}

export function isReactEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}

export function isFunction(val: unknown): val is (...args: unknown[]) => void {
  return typeof val === 'function'
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null) return false
  const proto = Object.getPrototypeOf(val) as unknown
  return proto === Object.prototype || proto === null
}
