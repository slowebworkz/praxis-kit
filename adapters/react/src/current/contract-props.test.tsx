/**
 * Compile-time type contract tests for `ContractProps<T, Mode>`.
 *
 * `React.ComponentProps<typeof Component>` always resolves against
 * `PolymorphicComponent`'s non-generic fallback overload — normal-mode props only (see that
 * type's own doc comment). A wrapper that always renders its base component with `asChild` (or
 * `render`) can't type its own props from `ComponentProps<typeof Base>`: assigning `asChild: true`
 * to that shape is a compile error, no matter how the JSX/props are rearranged. `ContractProps`
 * reads the phantom `__generics` marker back off the component's value type instead, reaching all
 * three render-mode shapes from outside the file that built it.
 *
 * Each test either:
 *   (a) contains JSX/code that must compile without error, or
 *   (b) uses @ts-expect-error to assert that a specific usage is rejected.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { ComponentProps, ReactElement } from 'react'
import { defineContractComponent } from '@praxis-kit/adapter-utils'
import type { ClassPluginFactory, EmptyRecord } from '@praxis-kit/core'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import type { LayoutKeyName } from '@praxis-kit/tailwind'
import { createContractComponent } from './create-contract-component'
import type { ContractProps } from '../shared'

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
    function Wrapper(props: ContractProps<typeof Container>): ReactElement {
      return <Container {...props} />
    }
    const _el = <Wrapper />
    void _el
  })
})

describe('ContractProps — asChild mode', () => {
  it("accepts a wrapper that always renders asChild — ComponentProps<typeof Component> can't express this", () => {
    // The wrapper's own external props omit `asChild` — it's hardcoded internally below, not
    // something a caller of AsChildWrapper chooses. This is the actual shape a
    // finding-#30-style wrapper needs: Omit<ContractProps<T, 'asChild'>, 'asChild'>, not the
    // asChild-required shape directly.
    function AsChildWrapper(
      props: Omit<ContractProps<typeof Container, 'asChild'>, 'asChild'>,
    ): ReactElement {
      return <Container {...props} asChild />
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
    function AsChildWrapper(props: ContractProps<typeof Container, 'asChild'>): ReactElement {
      // @ts-expect-error — as is forbidden in asChild mode
      return <Container {...props} asChild as="a" />
    }
    void AsChildWrapper
  })
})

describe('ContractProps — render mode', () => {
  it('accepts a wrapper that always renders via the render callback', () => {
    function RenderWrapper(props: ContractProps<typeof Container, 'render'>): ReactElement {
      return <Container {...props} />
    }
    const _el = <RenderWrapper render={(renderProps) => <div {...renderProps} />} />
    void _el
  })
})

describe('ContractProps — compound components', () => {
  it("resolves the root's own props through the sub-component intersection, unaffected by it", () => {
    expectTypeOf<ContractProps<typeof Card>>().toEqualTypeOf<ComponentProps<typeof Card>>()
  })

  it('asChild mode works the same way on a compound component root', () => {
    function CardAsChildWrapper(
      props: Omit<ContractProps<typeof Card, 'asChild'>, 'asChild'>,
    ): ReactElement {
      return <Card {...props} asChild />
    }
    const _el = (
      <CardAsChildWrapper>
        <span />
      </CardAsChildWrapper>
    )
    void _el
  })
})

describe('ContractProps — data-* passthrough (finding #43)', () => {
  // React's `JSX.IntrinsicElements[tag]` prop types carry no `data-*` index (the JSX checker
  // special-cases `data-*` at the call site), so a `data-*` a contract sets only in `defaults`
  // — `data-slot`, the near-universal styling hook — was absent from `ContractProps<typeof X>`
  // even though `<X data-slot="…" />` type-checks. A wrapper couldn't destructure it.
  const Img = defineContractComponent({
    tag: 'img',
    name: 'Img',
    defaults: { 'data-slot': 'img' },
    enforcement: { allowedAs: ['img'] },
  } as const)((options) => createContractComponent(options))

  it('a data-* key is destructurable and forwardable from ContractProps', () => {
    function Avatar({ 'data-slot': slot = 'avatar', ...rest }: ContractProps<typeof Img>): ReactElement {
      return <Img {...rest} data-slot={slot} />
    }
    const _el = <Avatar data-slot="custom" />
    void _el
  })

  it('holds when a styling.plugin contributes a discriminated union of props', () => {
    // Mirrors `createTailwindPipeline`, whose plugin props are a mutually-exclusive union
    // (`{ flex: true } | { grid: true } | …`) — before finding #43's fix that union distributed
    // through `ContractProps` and `data-slot` was no longer a common member. Finding #44's
    // `FlattenLayout` then collapses the union entirely, so `data-slot` is a plain member here.
    // Shape matches `LayoutProps`: one-of the exclusive `true`s, or none of them.
    type LayoutUnion =
      | { flex: true; grid?: never }
      | { grid: true; flex?: never }
      | { flex?: never; grid?: never }
    const layoutPlugin = (() => ({ pipeline: () => '' })) as unknown as ClassPluginFactory<LayoutUnion>

    const Box = defineContractComponent({
      tag: 'div',
      name: 'Box',
      defaults: { 'data-slot': 'box' },
      styling: { base: '', plugin: layoutPlugin },
    } as const)((options) => createContractComponent(options))

    expectTypeOf<ContractProps<typeof Box>['data-slot']>().toEqualTypeOf<
      string | number | boolean | undefined
    >()

    function BoxWrapper({
      'data-slot': slot = 'wrapper',
      ...rest
    }: Omit<ContractProps<typeof Box>, LayoutKeyName>): ReactElement {
      return <Box {...rest} data-slot={slot} />
    }
    const _el = <BoxWrapper data-slot="custom" />
    void _el
  })

  it('an arbitrary data-* attribute not named in the contract is still accepted', () => {
    expectTypeOf<ContractProps<typeof Img>['data-testid']>().toEqualTypeOf<
      string | number | boolean | undefined
    >()
  })
})

describe('ContractProps — layout-union collapse (finding #44)', () => {
  // `styling.plugin: createTailwindPipeline` contributes `ExclusiveTrueProp<LayoutKey>` — a
  // ~22-member mutually-exclusive union. Before the fix that union distributed through
  // `ContractProps`, so the extracted type was a ~22-way union with no common member: a
  // rest-destructure tripped `TS2700`, `Omit`/`Pick`/`Merge` tripped `TS2590`, and any prop the
  // union doesn't share (`data-slot`) was inaccessible. `FlattenLayout` collapses it to one flat
  // object where each layout key is an optional `true` — for the `ContractProps` extraction path
  // only; the strict union stays on the component's own call overloads (asserted last).
  const Box = defineContractComponent({
    tag: 'div',
    name: 'TwBox',
    defaults: { 'data-slot': 'box' },
    styling: { base: 'gap-2', plugin: createTailwindPipeline },
  } as const)((options) => createContractComponent(options))

  it('is one object type, not a union — common members are directly accessible', () => {
    expectTypeOf<ContractProps<typeof Box>['data-slot']>().toEqualTypeOf<
      string | number | boolean | undefined
    >()
    expectTypeOf<ContractProps<typeof Box>['flex']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<ContractProps<typeof Box>['grid']>().toEqualTypeOf<true | undefined>()
  })

  it('a rest-destructure yields a plain object type (no TS2700)', () => {
    // Before the fix the ~22-way union made this `TS2700 Rest types may only be created from
    // object types`.
    function readProps(props: ContractProps<typeof Box>): void {
      const { 'data-slot': _slot, flex: _flex, ...rest } = props
      expectTypeOf(rest).toBeObject()
    }
    void readProps
  })

  it('Omit / Pick / Merge over ContractProps no longer trip TS2590', () => {
    type WithoutFlex = Omit<ContractProps<typeof Box>, 'flex'>
    type JustGrid = Pick<ContractProps<typeof Box>, 'grid'>
    type Merged = ContractProps<typeof Box> & { extra?: string }
    expectTypeOf<WithoutFlex['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<JustGrid['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Merged['extra']>().toEqualTypeOf<string | undefined>()
  })

  it('a wrapper that does not re-expose layout props spreads onto <Box> with no cast', () => {
    // The realistic finding-#44 wrapper shape: take the contract minus the display props, forward
    // the rest. (Forwarding a flattened layout prop back onto the strict call signature still
    // needs an explicit branch or cast — that union is deliberately kept on the component.)
    function BoxWrapper(props: Omit<ContractProps<typeof Box>, LayoutKeyName>): ReactElement {
      return <Box {...props} />
    }
    const _el = <BoxWrapper data-slot="custom" />
    void _el
  })

  it('still rejects two layout props at the component call site — the strict union is intact', () => {
    // @ts-expect-error — only one display prop may be `true`; the `ExclusiveTrueProp` union stays
    // on the generic call overloads even though `ContractProps` flattens it.
    const _el = <Box flex grid />
    void _el
  })

  it('is the identity for a component with no tailwind plugin', () => {
    const Plain = createContractComponent<'div', EmptyRecord, EmptyRecord>({ name: 'Plain' })
    expectTypeOf<ContractProps<typeof Plain>>().toEqualTypeOf<ComponentProps<typeof Plain>>()
    // @ts-expect-error — `flex` is not a prop of a component that never opted into the pipeline.
    const _el = <Plain flex />
    void _el
  })
})
