import type { AnyRecord } from '../../types'
import { isObject } from './is-object'
import { isNull } from './is-null'

export function isRecord(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false

  const proto = Object.getPrototypeOf(value)

  return proto === Object.prototype || isNull(proto)
}
