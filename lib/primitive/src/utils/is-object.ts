// Not exported — used only by isObject to avoid typeof null === 'object' false positives.
function isNull(value: unknown): value is null {
  return value === null
}

export function isObject(value: unknown): value is object {
  return !isNull(value) && typeof value === 'object'
}
