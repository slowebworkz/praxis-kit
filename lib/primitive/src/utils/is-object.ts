export function isNull(value: unknown): value is null {
  return value === null
}

export function isObject(value: unknown): value is object {
  return !isNull(value) && typeof value === 'object'
}
