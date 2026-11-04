import type { AnyRecord } from '@praxis-kit/core'

/**
 * Re-keys the suite's neutral `class` prop as `className` for adapters that take the latter
 * (React, Preact). An absent `class` stays absent, so no `className: undefined` is introduced.
 */
export function classToClassName<T extends AnyRecord>(props: T): T {
  const { class: cls, ...rest } = props
  return (cls !== undefined ? { ...rest, className: cls } : rest) as T
}
