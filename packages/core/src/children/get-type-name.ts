export function getTypeName(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const primitive = typeof value

  if (primitive !== 'object') {
    return primitive
  }

  const name = value.constructor?.name

  return typeof name === 'string' && name !== 'Object' ? name : 'object'
}
