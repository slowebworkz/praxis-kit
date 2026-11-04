import { describe, expectTypeOf, it } from 'vitest'

/**
 * Companion to `merge-slot-props-types.spike.test.tsx`.
 *
 * A component's public props type describes every key it accepts, not which keys
 * were supplied at one particular JSX call site. Consequently, an optional key is
 * present in `keyof ChildProps` even when the consumer omits it. A reusable
 * `MergedProps<Parent, ComponentProps<typeof Child>>` therefore cannot reproduce
 * the literal-call-site result: it cannot tell an omitted key from a supplied key.
 */
type MergedProps<Parent, Child> = {
  [K in keyof Parent | keyof Child]: K extends keyof Child
    ? Child[K]
    : K extends keyof Parent
      ? Parent[K]
      : never
}

describe('asChild merged props — general component props types', () => {
  it('cannot preserve the parent literal when the child type declares the key optional', () => {
    type Parent = { 'data-slot': 'container' }
    type FigureProps = {
      'data-slot'?: string
      id?: string
    }
    type Merged = MergedProps<Parent, FigureProps>

    // This broad result is the limitation, not the desired merged runtime value.
    expectTypeOf<Merged['data-slot']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Merged['data-slot']>().not.toEqualTypeOf<'container'>()
  })

  it('erases the omitted-versus-supplied distinction once a declared FigureProps annotation is applied', () => {
    type FigureProps = { 'data-slot'?: string }
    // Stand-in for a component: its public signature annotates props as FigureProps.
    const Figure = (props: FigureProps) => props

    // Before the annotation, the two call sites have distinguishable types...
    const omittedAtCallSite = {}
    const suppliedAtCallSite = { 'data-slot': 'figure' }
    expectTypeOf(omittedAtCallSite).not.toEqualTypeOf(suppliedAtCallSite)

    // ...after it, both are the one declared type, and the key is listed either way.
    expectTypeOf(Figure(omittedAtCallSite)).toEqualTypeOf<FigureProps>()
    expectTypeOf(Figure(suppliedAtCallSite)).toEqualTypeOf<FigureProps>()
    expectTypeOf<keyof FigureProps>().toEqualTypeOf<'data-slot'>()
  })
})
