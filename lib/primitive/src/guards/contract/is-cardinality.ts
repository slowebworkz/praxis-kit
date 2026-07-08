import type { Cardinality } from '../../types'
import { isNumber, isRecord } from '../foundational'

export function isCardinality(value: unknown): value is Cardinality {
  if (!isRecord(value)) return false
  const kind = value['kind']
  if (kind === 'unbounded') return true
  if (kind !== 'bounded') return false
  return isNumber(value['min']) && isNumber(value['max'])
}
