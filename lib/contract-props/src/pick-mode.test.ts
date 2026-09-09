import { describe, it, expectTypeOf } from 'vitest'
import type { PickMode } from './pick-mode'

describe('PickMode', () => {
  it("selects TNormal for 'normal'", () => {
    expectTypeOf<PickMode<'normal', 'N', 'A', 'R'>>().toEqualTypeOf<'N'>()
  })

  it("selects TAsChild for 'asChild'", () => {
    expectTypeOf<PickMode<'asChild', 'N', 'A', 'R'>>().toEqualTypeOf<'A'>()
  })

  it("selects TRender for 'render'", () => {
    expectTypeOf<PickMode<'render', 'N', 'A', 'R'>>().toEqualTypeOf<'R'>()
  })

  // Distributive-conditional regression contract: every union combination maps to
  // exactly the union of the corresponding slots, in every pairing.
  it('distributes over every Mode union combination', () => {
    expectTypeOf<PickMode<'normal' | 'asChild', 'N', 'A', 'R'>>().toEqualTypeOf<'N' | 'A'>()
    expectTypeOf<PickMode<'normal' | 'render', 'N', 'A', 'R'>>().toEqualTypeOf<'N' | 'R'>()
    expectTypeOf<PickMode<'asChild' | 'render', 'N', 'A', 'R'>>().toEqualTypeOf<'A' | 'R'>()
    expectTypeOf<PickMode<'normal' | 'asChild' | 'render', 'N', 'A', 'R'>>().toEqualTypeOf<
      'N' | 'A' | 'R'
    >()
  })

  it('resolves to never for an unsupported slot, matching an adapter missing a mode', () => {
    expectTypeOf<PickMode<'render', 'N', 'A', never>>().toEqualTypeOf<never>()
  })

  it('drops the never slot from a union that includes an unsupported mode', () => {
    expectTypeOf<PickMode<'normal' | 'render', 'N', 'A', never>>().toEqualTypeOf<'N'>()
  })
})
