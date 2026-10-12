import type { VariantMap } from '@praxis-kit/primitive'
import { isRecord } from '../foundational'

export function isVariantMap(value: unknown): value is VariantMap {
  if (!isRecord(value)) return false
  return Object.values(value).every(isRecord)
}
