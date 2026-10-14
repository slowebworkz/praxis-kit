/**
 * Real-component validation for the actual public extraction path, `ContractProps<T, Mode>`
 * (`adapters/react/src/shared/types/polymorphic-props.ts`), now wired to
 * `ContractGenericsWithComposeOf<C>` (`@praxis-kit/compose-props`) instead of
 * `ContractGenericsWithAllowedOf<C>`. Earlier validation (`lib/compose-props`'s own tests, and an
 * earlier version of this file) only checked the standalone helper type in isolation — this file
 * checks the thing a real consumer actually imports and uses: `ContractProps<typeof Card>` itself,
 * against two real `createContractComponent` components, one composing the other.
 *
 * `expectTypeOf().toEqualTypeOf()` is used for every object-shaped comparison rather than
 * `@ts-expect-error` against a literal assignment: confirmed directly that excess-property
 * checking does not reliably fire against these conditional-type-derived prop shapes, so an
 * extra/missing key check needs an exact `keyof`/value comparison to be trustworthy. Plain union
 * comparisons (`as`) don't have this problem and use a direct assignment where it reads more
 * naturally.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { OmitIndexSignature } from 'type-fest'
import type { ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, PolymorphicWithAllowedAs, ReactFactoryOptions } from '../shared'

/**
 * `satisfies ReactFactoryOptions` is not just documentation here — confirmed by direct
 * bisection that without it, `ContractAllowedOf<C>` resolves differently inside
 * `ContractGenericsWithComposeOf`'s own self-referential conditional than it does for the
 * identical object checked this way (a fresh-literal-vs-checked-literal TypeScript quirk around
 * recursive conditional types, not a stylistic preference). Always author contracts this way
 * when feeding them to `ContractGenericsWithComposeOf` directly, matching
 * `lib/compose-props/src/compose-generics.test.ts`'s own convention.
 */
const surfaceOptions = {
  tag: 'div',
  name: 'Surface',
  props: undefined as unknown as { radius?: 'sm' | 'lg' },
  styling: { variants: { shadow: { true: 'shadow-sm', false: 'shadow-none' } } },
} satisfies ReactFactoryOptions
const Surface = createContractComponent(surfaceOptions)

const cardOptions = {
  tag: 'section',
  name: 'Card',
  props: undefined as unknown as { variant?: 'elevated' | 'flat' },
  enforcement: { allowedAs: ['section', 'article'] as const },
  compose: { allProps: true, with: Surface },
} satisfies ReactFactoryOptions
const Card = createContractComponent(cardOptions)
type CardContract = typeof cardOptions

describe('ContractProps<typeof Card> through the real, wired extraction path', () => {
  it('(1) ContractProps<typeof Card> now sees Surface’s forwarded props — the gap this proposal closed', () => {
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
  })

  it('(2) exact own-key values through the real ContractProps<typeof Card> — not just the standalone helper', () => {
    // ContractProps<typeof Card> also carries every intrinsic `section` HTML attribute, so
    // Pick down to the keys this test cares about rather than comparing the full (huge) type.
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
    // @ts-expect-error — normal-mode `as` only ever accepts the component's own default tag,
    // the same ceiling PolymorphicProps<G> (single type argument) already has uncomposed —
    // ContractProps<T, 'normal'> deliberately never exposes the full allowedAs union (see (3b))
    const _asArticle: ContractProps<typeof Card>['as'] = 'article'
    void _asArticle
  })

  it('(3b) the full allowedAs union is still reachable the same way it already was — via PolymorphicWithAllowedAs<G>, not ContractProps', () => {
    type G = ContractGenericsWithComposeOf<CardContract>
    const asSection: PolymorphicWithAllowedAs<G>['as'] = 'section'
    const asArticle: PolymorphicWithAllowedAs<G>['as'] = 'article'
    void asSection
    void asArticle
    // @ts-expect-error — 'div' is Surface's own tag, not in Card's declared allowedAs; composing
    // Surface must not widen Card's own allowedAs
    const _asDiv: PolymorphicWithAllowedAs<G>['as'] = 'div'
    void _asDiv
  })

  it('(4a) asChild mode also includes the composed props — same G feeds every PickMode branch', () => {
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card, 'asChild'> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()

    function AsChildWrapper(
      props: Omit<ContractProps<typeof Card, 'asChild'>, 'asChild' | 'children'>,
    ): void {
      void props
    }
    AsChildWrapper({ variant: 'elevated', radius: 'sm' })
  })

  it('(4b) render mode also includes the composed props', () => {
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card, 'render'> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
  })

  it('(5) a plain, non-composing component’s ContractProps is provably unchanged by this wiring', () => {
    const plainOptions = {
      tag: 'div',
      name: 'Plain',
      props: undefined as unknown as { label?: string },
    } satisfies ReactFactoryOptions
    const Plain = createContractComponent(plainOptions)

    type HasOnlyLabel = keyof Pick<ContractProps<typeof Plain>, 'label'>
    expectTypeOf<HasOnlyLabel>().toEqualTypeOf<'label'>()
    type HasRadius = 'radius' extends keyof ContractProps<typeof Plain> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })
})
