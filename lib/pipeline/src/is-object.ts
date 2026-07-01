import { isObject as _isObject } from '@praxis-kit/primitive'

export function isObject(value: unknown): value is Record<string, unknown> {
  return _isObject(value, true)
}
