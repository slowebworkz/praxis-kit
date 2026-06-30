import type { VariantMap } from '../../types'
import { isRecord } from '../foundational/is-record'

export function isVariantMap(value: unknown): value is VariantMap {
  if (!isRecord(value)) return false
  return Object.values(value).every(isRecord)
}
