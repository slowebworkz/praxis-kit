import type { AnyFunction, AnyRecord } from '../types'

export function isObject(value: unknown, excludeArrays: true): value is AnyRecord
export function isObject(value: unknown, excludeArrays?: false): value is object
export function isObject(value: unknown, excludeArrays = false): boolean {
  if (value === null || typeof value !== 'object') return false
  return excludeArrays ? !Array.isArray(value) : true
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === 'function'
}

export function isPlainObject(value: unknown): value is AnyRecord {
  if (!isObject(value, true)) return false
  const proto = Object.getPrototypeOf(value)
  // null-prototype objects (Object.create(null)) are also plain objects.
  return proto === Object.prototype || proto === null
}
