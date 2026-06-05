import type { WithChildRules } from '../../types'
import { isArray, isRecord } from '../foundational'

export function isComponentConstraint(value: unknown): value is WithChildRules {
  if (!isRecord(value)) return false
  const enforcement = value['enforcement']
  if (enforcement === undefined) return true
  if (!isRecord(enforcement)) return false
  const children = enforcement['children']
  return children === undefined || isArray(children)
}
