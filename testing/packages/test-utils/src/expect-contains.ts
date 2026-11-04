import { expect } from 'vitest'

export type ContainsSpec = {
  readonly has?: readonly string[]
  readonly lacks?: readonly string[]
}

/**
 * Asserts that every `has` token is, and every `lacks` token is not, contained in `subject`.
 * For a string that is a substring match; for an array it is whole-element membership, which is
 * what makes `flex` not match `flex-col` when `subject` is a split class list.
 */
export function expectContains(
  subject: string | readonly string[],
  { has = [], lacks = [] }: ContainsSpec,
): void {
  for (const token of has) expect(subject).toContain(token)
  for (const token of lacks) expect(subject).not.toContain(token)
}
