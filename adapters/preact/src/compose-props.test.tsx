/**
 * Real-component validation for the actual public extraction path, `ContractProps<T, Mode>`
 * (`adapters/preact/src/types/polymorphic-props.ts`), now wired to
 * `ContractGenericsWithComposeOf<C>` (`@praxis-kit/compose-props`) instead of plain
 * `ContractGenericsOf<C>` — mirrors `adapters/react/src/current/compose-props.test.tsx`, minus
 * the `'render'`-mode section (Preact has no render-callback render strategy, unlike React).
 *
 * `expectTypeOf().toEqualTypeOf()` is used for every object-shaped comparison rather than
 * `@ts-expect-error` against a literal assignment: confirmed directly (in the React adapter's own
 * version of this file) that excess-property checking does not reliably fire against these
 * conditional-type-derived prop shapes, so an extra/missing key check needs an exact
 * `keyof`/value comparison to be trustworthy. Plain union comparisons (`as`) don't have this
 * problem and use a direct assignment where it reads more naturally.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { PreactFactoryOptions } from './preact-options'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, PolymorphicWithAllowedAs } from './types'
import type { ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'

const surfaceOptions = {
  tag: 'div',
  name: 'Surface',
  props: undefined as unknown as { radius?: 'sm' | 'lg' },
  styling: { variants: { shadow: { true: 'shadow-sm', false: 'shadow-none' } } },
} satisfies PreactFactoryOptions
const Surface = createContractComponent(surfaceOptions)

const cardOptions = {
  tag: 'section',
  name: 'Card',
  props: undefined as unknown as { variant?: 'elevated' | 'flat' },
  enforcement: { allowedAs: ['section', 'article'] as const },
  compose: { allProps: true, with: Surface },
} satisfies PreactFactoryOptions
const Card = createContractComponent(cardOptions)
type CardContract = typeof cardOptions

describe('ContractProps<typeof Card> through the real, wired extraction path', () => {
  it('(1) ContractProps<typeof Card> now sees Surface’s forwarded props', () => {
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
  })

  it('(2) exact own-key values through the real ContractProps<typeof Card>', () => {
    type OwnKeys = 'variant' | 'radius' | 'shadow'
    type Picked = Pick<ContractProps<typeof Card>, OwnKeys>
    expectTypeOf<Picked>().toEqualTypeOf<{
      variant?: 'elevated' | 'flat'
      radius?: 'sm' | 'lg'
      shadow?: boolean
    }>()
  })

  it('(3a) `as` in normal mode still only accepts Card’s own default tag, unchanged by composing', () => {
    const asSection: ContractProps<typeof Card>['as'] = 'section'
    void asSection
    // @ts-expect-error — normal-mode `as` only ever accepts the component's own default tag
    const _asArticle: ContractProps<typeof Card>['as'] = 'article'
    void _asArticle
  })

  it('(3b) the full allowedAs union is still reachable via PolymorphicWithAllowedAs<G>, not ContractProps', () => {
    type G = ContractGenericsWithComposeOf<CardContract>
    const asSection: PolymorphicWithAllowedAs<G>['as'] = 'section'
    const asArticle: PolymorphicWithAllowedAs<G>['as'] = 'article'
    void asSection
    void asArticle
    // @ts-expect-error — 'div' is Surface's own tag, not in Card's declared allowedAs
    const _asDiv: PolymorphicWithAllowedAs<G>['as'] = 'div'
    void _asDiv
  })

  it('(4) asChild mode also includes the composed props', () => {
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card, 'asChild'> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
  })

  it('(5) a plain, non-composing component’s ContractProps is provably unchanged by this wiring', () => {
    const plainOptions = {
      tag: 'div',
      name: 'Plain',
      props: undefined as unknown as { label?: string },
    } satisfies PreactFactoryOptions
    const Plain = createContractComponent(plainOptions)

    type HasOnlyLabel = keyof Pick<ContractProps<typeof Plain>, 'label'>
    expectTypeOf<HasOnlyLabel>().toEqualTypeOf<'label'>()
    type HasRadius = 'radius' extends keyof ContractProps<typeof Plain> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(6) nested composition through the real extraction path: Card → Surface → Base', () => {
    const baseOptions = {
      tag: 'span',
      name: 'Base',
      props: undefined as unknown as { tone?: 'light' | 'dark' },
    } satisfies PreactFactoryOptions
    const Base = createContractComponent(baseOptions)

    const surfaceComposingBaseOptions = {
      tag: 'div',
      name: 'SurfaceComposingBase',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
      compose: { allProps: true, with: Base },
    } satisfies PreactFactoryOptions
    const SurfaceComposingBase = createContractComponent(surfaceComposingBaseOptions)

    const nestedCardOptions = {
      tag: 'article',
      name: 'NestedCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: true, with: SurfaceComposingBase },
    } satisfies PreactFactoryOptions
    const NestedCard = createContractComponent(nestedCardOptions)

    type HasVariant = 'variant' extends keyof ContractProps<typeof NestedCard> ? true : false
    type HasRadius = 'radius' extends keyof ContractProps<typeof NestedCard, 'asChild'>
      ? true
      : false
    type HasTone = 'tone' extends keyof ContractProps<typeof NestedCard> ? true : false
    expectTypeOf<HasVariant>().toEqualTypeOf<true>()
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
    expectTypeOf<HasTone>().toEqualTypeOf<true>()
  })

  it('(7) design decision — collision validation is a downstream diagnostic, not declaration-site rejection', () => {
    const collidingSurfaceOptions = {
      tag: 'div',
      name: 'CollidingSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies PreactFactoryOptions
    const CollidingSurface = createContractComponent(collidingSurfaceOptions)

    const collidingCardOptions = {
      tag: 'article',
      name: 'CollidingCard',
      props: undefined as unknown as { radius?: 'thin' | 'thick' },
      compose: { allProps: true, with: CollidingSurface },
    } satisfies PreactFactoryOptions
    const CollidingCard = createContractComponent(collidingCardOptions)

    function ConsumesEverythingExceptRadius(
      props: Omit<ContractProps<typeof CollidingCard>, 'radius'>,
    ): void {
      void props
    }
    ConsumesEverythingExceptRadius({})
  })
})
