import { isObject } from '../utils/is-object'
import { EVENT_HANDLER_RE } from './constants'

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

function isNull(value: unknown): value is null {
  return value === null
}

type AnyRecord = Record<string, unknown>

export function isPlainObject(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || isNull(proto)
}

export function isEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}
