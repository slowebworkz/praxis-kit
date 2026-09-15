import { describe, it, expectTypeOf } from 'vitest'
import type { HasContract } from './has-contract'

/** Minimal stand-in for a contract shape — this package doesn't depend on `@praxis-kit/core`, so
 *  the test mocks just enough shape to exercise `HasContract<C>`. */
interface MockContract<TTag, TName extends string> {
  tag: TTag
  name: TName
}

/**
 * Mirrors the actual shape `HasContract<C>` exists to support: an overloaded callable with several
 * generic call signatures plus a non-generic fallback anchored to a default shape — the same
 * structure as React/Preact's `PolymorphicComponent<G, C>`, where `ComponentProps<typeof X>`-style
 * extraction only ever resolves against the last (fallback) signature, making `C` otherwise
 * unrecoverable for the other signatures.
 */
type OverloadedComponent<C extends MockContract<unknown, string>> = {
  (props: { asChild: true } & C): void
  (props: { asChild?: false } & C): void // non-generic fallback, mirrors ComponentProps<T>
}

type ExtractContract<T extends HasContract<unknown>> = T extends HasContract<infer C> ? C : never

describe('HasContract against an overloaded callable', () => {
  it('recovers C through an intersection with multiple call signatures + a non-generic fallback', () => {
    type C = MockContract<'div', 'Box'>
    type Component = HasContract<C> & OverloadedComponent<C>

    type Recovered = ExtractContract<Component>

    expectTypeOf<Recovered>().toEqualTypeOf<C>()
  })

  it('still recovers C when further metadata is intersected onto the marker', () => {
    type C = MockContract<'button', 'Button'>
    type Component = HasContract<C> &
      OverloadedComponent<C> & { displayName?: string; readonly $$typeof?: symbol }

    expectTypeOf<ExtractContract<Component>>().toEqualTypeOf<C>()
  })

  it('recovers C from the bare marker with no call signatures', () => {
    type C = MockContract<'span', 'Span'>
    expectTypeOf<ExtractContract<HasContract<C>>>().toEqualTypeOf<C>()
  })

  it('is a genuinely different marker from HasGenerics — a component carries both, not one broadened', () => {
    type C = MockContract<'a', 'Link'>
    type G = { default: 'a'; props: { href: string } }
    type Component = HasContract<C> & { readonly __generics?: G }

    expectTypeOf<ExtractContract<Component>>().toEqualTypeOf<C>()
  })
})
