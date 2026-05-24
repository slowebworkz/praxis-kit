import { EVENT_HANDLER_RE } from './constants'

export function isEventKey(key: string): boolean {
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
