function panic(message: string): never {
  throw new Error(message)
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) panic(message)
}

export function invariantDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value == null) panic(message)
}
