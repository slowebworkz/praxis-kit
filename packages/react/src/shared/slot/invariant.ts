/**
 * Assertion helpers for invariant conditions within the slot layer.
 *
 * `invariant` asserts a truthy condition; `invariantDefined` asserts non-nullability.
 * Both throw immediately — they are not gated on strict mode.
 */
function panic(message: string): never {
  throw new Error(message)
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) panic(message)
}

export function invariantDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value == null) panic(message)
}
