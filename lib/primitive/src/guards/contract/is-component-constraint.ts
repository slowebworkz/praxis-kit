import type { WithChildRules } from '../../types'
import { isArray } from '../foundational/is-array'
import { isUndefined } from '../foundational/is-defined'
import { isRecord } from '../foundational'

export function isComponentConstraint(value: unknown): value is WithChildRules {
  if (!isRecord(value)) return false
  const enforcement = value['enforcement']
  if (isUndefined(enforcement)) return true
  if (!isRecord(enforcement)) return false
  const children = enforcement['children']
  return isUndefined(children) || isArray(children)
}
