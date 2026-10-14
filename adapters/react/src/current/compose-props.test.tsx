/**
 * Real-component validation for `ContractGenericsWithComposeOf` (`@praxis-kit/compose-props`,
 * `docs/design/compose-props-typing.md`) — the design doc's own spike and `lib/compose-props`'s
 * own tests validate the type function against bare contract literals; this file builds two real
 * React components via `createContractComponent`, one composing the other, and checks the two
 * things neither of those could: that the composed type is accurate against *this adapter's own*
 * `PolymorphicProps`/`PolymorphicWithAllowedAs`, and that `as`/polymorphism isn't narrowed (or
 * widened) improperly in the process.
 *
 * `expectTypeOf().toEqualTypeOf()` is used for every object-shaped comparison rather than
 * `@ts-expect-error` against a literal assignment: confirmed directly (see the real debugging
 * behind this file) that excess-property checking does not reliably fire against these
 * conditional-type-derived prop shapes, so an extra/missing key check needs an exact `keyof`
 * comparison to be trustworthy. Plain union comparisons (`as`) don't have this problem and use a
 * direct assignment where it reads more naturally.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { OmitIndexSignature } from 'type-fest'
import type { ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'
import type { PolymorphicGenerics, PropsOf } from '@praxis-kit/core'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, PolymorphicWithAllowedAs, ReactFactoryOptions } from '../shared'

type OwnProps<G extends PolymorphicGenerics> = OmitIndexSignature<PropsOf<G>>

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
type Resolved = ContractGenericsWithComposeOf<CardContract>

describe('ContractGenericsWithComposeOf against two real createContractComponent components', () => {
  it('(a) today — ContractProps<typeof Card> still does not see Surface’s forwarded props (the gap this proposal closes, not yet wired into this adapter)', () => {
    // ContractProps<typeof Card> also carries every intrinsic `section` HTML attribute
    // (hundreds of them), so comparing the full `keyof` set is both fragile and beside the
    // point — the one fact that matters is whether `radius` (Surface's, not Card's own) leaked
    // in despite `ContractProps` never reading `compose` today.
    type HasRadius = 'radius' extends keyof ContractProps<typeof Card> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(a) once resolved through ContractGenericsWithComposeOf, the merged own-props accurately include both sides and nothing else', () => {
    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{
      variant?: 'elevated' | 'flat'
      radius?: 'sm' | 'lg'
    }>()
  })

  it('(b) `allowed` keeps Card’s own declared allowedAs — not widened to the default ElementType the way the unguarded implementation first did', () => {
    expectTypeOf<Resolved['allowed']>().toEqualTypeOf<'section' | 'article'>()
  })

  it('(b) `as` on the composed type’s normal-mode props accepts Card’s own default tag, matching an uncomposed component', () => {
    const asSection: ContractProps<typeof Card>['as'] = 'section'
    void asSection
    // @ts-expect-error — normal-mode `as` only ever accepts the component's own default tag,
    // the same ceiling PolymorphicProps<G> (single type argument) already has uncomposed
    const _asArticle: ContractProps<typeof Card>['as'] = 'article'
    void _asArticle
  })

  it('(b) `as` through PolymorphicWithAllowedAs reaches Card’s full allowedAs union, including the non-default tag', () => {
    const asSection: PolymorphicWithAllowedAs<Resolved>['as'] = 'section'
    const asArticle: PolymorphicWithAllowedAs<Resolved>['as'] = 'article'
    void asSection
    void asArticle
    // @ts-expect-error — 'div' is Surface's own tag, not in Card's declared allowedAs
    const _asDiv: PolymorphicWithAllowedAs<Resolved>['as'] = 'div'
    void _asDiv
  })
})
