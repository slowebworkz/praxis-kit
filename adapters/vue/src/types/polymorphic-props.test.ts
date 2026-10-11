/**
 * Finding #47: `PolymorphicProps<G>` (one type argument) silently narrows `as` to just `G`'s
 * default tag instead of the full `allowedAs` union, because `TAs` defaults to `DefaultOf<G>` —
 * a single tag literal — not `AllowedOf<G>`. `PolymorphicWithAllowedAs<G>` is the additive opt-in
 * that widens it; it must not change `PolymorphicProps<G>`'s own existing, intentional default.
 * No runtime assertions are made. This file exists to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicProps, PolymorphicWithAllowedAs } from './polymorphic-props'

describe('PolymorphicWithAllowedAs<G>', () => {
  type GWithAllowed = PolymorphicGenerics<
    'div',
    EmptyRecord,
    Readonly<EmptyRecord>,
    Readonly<EmptyRecord>,
    'div' | 'nav' | 'section'
  >

  it("PolymorphicProps<G> (one type argument) stays narrowed to G's default tag", () => {
    expectTypeOf<PolymorphicProps<GWithAllowed>['as']>().toEqualTypeOf<'div' | undefined>()
  })

  it("PolymorphicWithAllowedAs<G> widens `as` to G's full allowed-tag union", () => {
    expectTypeOf<PolymorphicWithAllowedAs<GWithAllowed>['as']>().toEqualTypeOf<
      'div' | 'nav' | 'section' | undefined
    >()
  })
})
