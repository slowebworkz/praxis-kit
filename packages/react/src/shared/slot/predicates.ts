import { EVENT_HANDLER_RE } from './constants'

export function isEventKey(key: string): boolean {
  return EVENT_HANDLER_RE.test(key)
}

export function isFunction(val: unknown): val is (...args: unknown[]) => void {
  return typeof val === 'function'
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}
