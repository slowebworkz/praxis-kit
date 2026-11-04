import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord } from '@praxis-kit/core'

/**
 * Type-level spike for finding #32: can a reusable type describe the result of
 * `asChild` slot merging when the child's own defaults have not yet been applied?
 *
 * Runtime `mergeSlotProps` only iterates the child's own keys. If a key is absent,
 * the parent's value survives. The child component's defaults are resolved later,
 * after the slot has injected the parent value, so those defaults cannot replace it.
 *
 * This spike deliberately models only the child-wins policy needed to test key
 * presence. The production merge's class/style/handler policies are orthogonal to
 * the limitation being investigated here.
 */
type MergedProps<Parent, Child> = {
  [K in keyof Parent | keyof Child]: K extends keyof Child
    ? Child[K]
    : K extends keyof Parent
      ? Parent[K]
      : never
}

describe('asChild merged props — literal call-site types', () => {
  it('preserves the parent value when the child did not pass that key', () => {
    type Parent = { 'data-slot': 'container' }
    type ChildPropsAtCallSite = EmptyRecord
    type Merged = MergedProps<Parent, ChildPropsAtCallSite>

    expectTypeOf<Merged['data-slot']>().toEqualTypeOf<'container'>()
  })

  it('uses an explicitly supplied child value when the key is present', () => {
    type Parent = { 'data-slot': 'container' }
    type ChildPropsAtCallSite = { 'data-slot': 'figure' }
    type Merged = MergedProps<Parent, ChildPropsAtCallSite>

    expectTypeOf<Merged['data-slot']>().toEqualTypeOf<'figure'>()
  })

  it('preserves an explicitly present undefined value at the slot-merge stage', () => {
    type Parent = { 'data-slot': 'container' }
    type ChildPropsAtCallSite = { 'data-slot': undefined }
    type Merged = MergedProps<Parent, ChildPropsAtCallSite>

    expectTypeOf<Merged['data-slot']>().toEqualTypeOf<undefined>()
  })
})
