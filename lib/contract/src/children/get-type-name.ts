import { isString } from '@praxis-kit/primitive'

export function getTypeName(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const primitive = typeof value

  if (primitive !== 'object') {
    return primitive
  }

  const name = (value as object).constructor?.name

  return isString(name) && name !== 'Object' ? name : 'object'
}
