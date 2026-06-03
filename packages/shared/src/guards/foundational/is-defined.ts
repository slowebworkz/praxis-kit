export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}
