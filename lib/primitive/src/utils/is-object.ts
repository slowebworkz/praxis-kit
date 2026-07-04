export function isObject(value: unknown, excludeArrays: true): value is Record<string, unknown>
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
