export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function invariantDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value == null) throw new Error(message)
}
