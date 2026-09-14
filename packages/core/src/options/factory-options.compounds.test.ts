/**
 * Compile-time type contract: the generic `FactoryOptions` (finding #29/#35).
 *
 * Leaving `FactoryOptions`'s variant generic at the bare `VariantMap` erases the real variant
 * shape from `styling.compounds` conditions — a boolean-shaped axis (`{ true, false }`) resolves
 * to `string`, not `boolean`. Passing the concrete `typeof variants` instead fixes that. (Formerly
 * demonstrated via `AnyFactoryOptions`, which pinned the same generic the same way; that type has
 * since been removed — `FactoryOptions<'textarea', TextareaProps, VariantMap>` reproduces the
 * identical erasure directly, with no separate type needed to do it.)
 *
 * No runtime assertions — a `@ts-expect-error` with nothing to catch is itself a
 * compile failure, so the negative cases are self-policing.
 */
import { describe, it } from 'vitest'

import type { FactoryOptions, VariantMap } from '../types'

const variants = {
  unstyled: { true: 'border-0', false: 'border' },
  size: { sm: 'text-sm', lg: 'text-lg' },
} as const

type TextareaProps = { value?: string }
type Options = FactoryOptions<'textarea', TextareaProps, typeof variants>
type ErasedOptions = FactoryOptions<'textarea', TextareaProps, VariantMap>

describe('FactoryOptions — boolean-shaped compound conditions', () => {
  it('accepts a real boolean condition when given the concrete variants', () => {
    const ok = {
      tag: 'textarea',
      styling: {
        variants,
        compounds: [{ unstyled: true, class: 'p-0' }],
      },
    } satisfies Options
    void ok
  })

  it('rejects a real boolean condition under a type-erased variant generic', () => {
    const bad = {
      tag: 'textarea',
      styling: {
        variants,
        compounds: [
          // @ts-expect-error `true` is not assignable to `string` — a bare `VariantMap`
          // can't see that `unstyled` is boolean-shaped.
          { unstyled: true, class: 'p-0' },
        ],
      },
    } satisfies ErasedOptions
    void bad
  })

  it('rejects an invalid literal, proving the condition narrows to boolean not string', () => {
    const bad = {
      tag: 'textarea',
      styling: {
        variants,
        compounds: [
          // @ts-expect-error `'nope'` is not a valid `unstyled` condition value.
          { unstyled: 'nope', class: 'p-0' },
        ],
      },
    } satisfies Options
    void bad
  })

  it('still checks string-enum axes against their real literals', () => {
    const bad = {
      tag: 'textarea',
      styling: {
        variants,
        compounds: [
          // @ts-expect-error `'xl'` is not one of `size`'s declared values.
          { size: 'xl', class: 'p-0' },
        ],
      },
    } satisfies Options
    void bad
  })
})
