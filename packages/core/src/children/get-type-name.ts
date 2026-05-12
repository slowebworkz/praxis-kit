export function getTypeName(child: unknown): string {
  if (child === null) return 'null'
  if (child === undefined) return 'undefined'

  if (typeof child === 'object') {
    const ctor = (child as object).constructor
    if (ctor && ctor !== Object) {
      const { name } = ctor
      if (typeof name === 'string' && name.length > 0) {
        return name
      }
    }
  }

  return typeof child
}
