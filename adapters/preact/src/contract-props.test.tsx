/**
 * Compile-time type contract tests for `ContractProps<T, Mode>` — mirrors
 * `adapters/react/src/current/contract-props.test.tsx`, minus the `'render'`-mode section
 * (Preact has no render-callback render strategy, unlike React).
 *
 * `ComponentProps<typeof Component>`-style extraction always resolves against
 * `PolymorphicComponent`'s non-generic fallback overload — normal-mode props only (see that
 * type's own doc comment). A wrapper that always renders its base component with `asChild` can't
 * type its own props from that extraction: assigning `asChild: true` to the fallback's shape is a
 * compile error, no matter how the JSX/props are rearranged. `ContractProps` reads the phantom
 * `__generics` marker back off the component's value type instead, reaching the asChild shape
 * from outside the file that built it.
 *
 * Each test either:
 *   (a) contains JSX/code that must compile without error, or
 *   (b) uses @ts-expect-error to assert that a specific usage is rejected.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { ComponentProps, JSX } from 'preact'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import type { LayoutKeyName } from '@praxis-kit/tailwind'
import { createContractComponent } from './create-contract-component'
import type { ContractProps } from './types'
import type { EmptyRecord } from '@praxis-kit/core'

const Container = createContractComponent<'div', EmptyRecord, EmptyRecord>({ name: 'Container' })

const Card = createContractComponent<'section', EmptyRecord, EmptyRecord>({
  name: 'Card',
  subComponents: {
    Header: createContractComponent<'header', EmptyRecord, EmptyRecord>({ name: 'CardHeader' }),
  },
})

describe('ContractProps — normal mode', () => {
  it('matches ComponentProps<typeof Component> for the shape ComponentProps can already express', () => {
    expectTypeOf<ContractProps<typeof Container>>().toEqualTypeOf<
      ComponentProps<typeof Container>
    >()
  })

  it('a normal-mode wrapper needs no cast', () => {
    function Wrapper(props: ContractProps<typeof Container>): JSX.Element {
      return <Container {...props} />
    }
    const _el = <Wrapper />
    void _el
  })
})

describe('ContractProps — asChild mode', () => {
  it("accepts a wrapper that always renders asChild — ComponentProps<typeof Component> can't express this", () => {
    function AsChildWrapper(
      props: Omit<ContractProps<typeof Container, 'asChild'>, 'asChild'>,
    ): JSX.Element {
      // Explicit <'div'> type argument on the JSX tag: spreading `props` into a fresh
      // { ...props, asChild: true }-shaped attribute set makes TS re-infer TAs from scratch,
      // since ref?: Ref<ElementRef<TAs>> is a contravariant-only position with nothing else in
      // the JSX attributes to pin TAs from — it lands on `never` instead of reusing the concrete
      // TAs already baked into ContractProps's output. Inference-only quirk of the spread-JSX
      // shape, not a ContractProps defect (the "normal mode" test above, which doesn't merge in a
      // new literal attribute, doesn't hit it).
      return <Container<'div'> {...props} asChild />
    }
    const _el = (
      <AsChildWrapper>
        <span />
      </AsChildWrapper>
    )
    void _el
  })

  it('rejects the same asChild assignment through ComponentProps — confirms the gap ContractProps closes', () => {
    // @ts-expect-error — ComponentProps<typeof Container> pins asChild to false via
    // PolymorphicComponent's fallback overload; ContractProps is what reaches the asChild branch.
    const _props: ComponentProps<typeof Container> = { asChild: true, children: <span /> }
    void _props
  })

  it('still forbids as, matching PolymorphicWithAsChild', () => {
    function AsChildWrapper(props: ContractProps<typeof Container, 'asChild'>): JSX.Element {
      // @ts-expect-error — as is forbidden in asChild mode
      return <Container {...props} asChild as="a" />
    }
    void AsChildWrapper
  })
})

describe('ContractProps — compound components', () => {
  it("resolves the root's own props through the sub-component intersection, unaffected by it", () => {
    expectTypeOf<ContractProps<typeof Card>>().toEqualTypeOf<ComponentProps<typeof Card>>()
  })

  it('asChild mode works the same way on a compound component root', () => {
    function CardAsChildWrapper(
      props: Omit<ContractProps<typeof Card, 'asChild'>, 'asChild'>,
    ): JSX.Element {
      // See the same explicit-type-argument note on Container's AsChildWrapper above.
      return <Card<'section'> {...props} asChild />
    }
    const _el = (
      <CardAsChildWrapper>
        <span />
      </CardAsChildWrapper>
    )
    void _el
  })
})

describe('ContractProps — layout-union collapse (finding #44)', () => {
  // `styling.plugin: createTailwindPipeline` contributes `ExclusiveTrueProp<LayoutKey>` — a
  // ~22-member mutually-exclusive union. Before the fix that union distributed through
  // `ContractProps`, so the extracted type was a ~22-way union with no common member: a
  // rest-destructure tripped `TS2700`, `Omit`/`Pick`/`Merge` tripped `TS2590`, `data-slot` was
  // inaccessible. `FlattenLayout` collapses it to one flat object (each layout key an optional
  // `true`) on the `ContractProps` extraction path only — the strict union stays on the
  // component's own call overloads.
  const Box = createContractComponent({
    tag: 'div',
    name: 'TwBox',
    defaults: { 'data-slot': 'box' },
    styling: { base: 'gap-2', plugin: createTailwindPipeline },
  })

  it('is one object type, not a union — common members are directly accessible', () => {
    expectTypeOf<ContractProps<typeof Box>['flex']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<ContractProps<typeof Box>['grid']>().toEqualTypeOf<true | undefined>()
  })

  it('Omit / Pick / Merge over ContractProps no longer trip TS2590', () => {
    expectTypeOf<Omit<ContractProps<typeof Box>, 'flex'>['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Pick<ContractProps<typeof Box>, 'grid'>['grid']>().toEqualTypeOf<true | undefined>()
    type Merged = ContractProps<typeof Box> & { extra?: string }
    expectTypeOf<Merged['extra']>().toEqualTypeOf<string | undefined>()
  })

  it('a rest-destructure yields a plain object type (no TS2700)', () => {
    function readProps(props: ContractProps<typeof Box>): void {
      const { flex: _flex, ...rest } = props
      expectTypeOf(rest).toBeObject()
    }
    void readProps
  })

  it('a wrapper that does not re-expose layout props spreads onto <Box> with no cast', () => {
    function BoxWrapper(props: Omit<ContractProps<typeof Box>, LayoutKeyName>): JSX.Element {
      return <Box {...props} />
    }
    void BoxWrapper
  })

  it('still rejects two layout props at the component call site — the strict union is intact', () => {
    // @ts-expect-error — only one display prop may be `true`.
    const _el = <Box flex grid />
    void _el
  })

  it('is the identity for a component with no tailwind plugin', () => {
    const Plain = createContractComponent<'div', EmptyRecord, EmptyRecord>({ name: 'PlainBox' })
    expectTypeOf<ContractProps<typeof Plain>>().toEqualTypeOf<ComponentProps<typeof Plain>>()
    // @ts-expect-error — `flex` is not a prop of a component that never opted into the pipeline.
    const _el = <Plain flex />
    void _el
  })
})
