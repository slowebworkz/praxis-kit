import { isObject } from '../utils/is-object'
import { EVENT_HANDLER_RE } from './constants'
import type { AnyRecord } from '../types'

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

export function isPlainObject(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false
  const proto = Object.getPrototypeOf(value)
  // null-prototype objects (Object.create(null)) are also plain objects.
  return proto === Object.prototype || proto === null
}

export function isEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}
