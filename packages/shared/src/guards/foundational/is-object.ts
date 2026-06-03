import { isNull } from './is-null'
export function isObject(value: unknown): value is object {
  return !isNull(value) && typeof value === 'object'
}
