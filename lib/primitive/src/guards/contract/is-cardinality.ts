import type { Cardinality } from '../../types'
import { isNumber } from '../foundational/is-number'
import { isRecord } from '../foundational/is-record'

export function isCardinality(value: unknown): value is Cardinality {
  if (!isRecord(value)) return false
  const kind = value['kind']
  if (kind === 'unbounded') return true
  if (kind !== 'bounded') return false
  return isNumber(value['min']) && isNumber(value['max'])
}
