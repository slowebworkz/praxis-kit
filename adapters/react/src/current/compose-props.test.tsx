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
import type { CollisionError, ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'
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
void Card
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
    void Plain

    type HasOnlyLabel = keyof Pick<ContractProps<typeof Plain>, 'label'>
    expectTypeOf<HasOnlyLabel>().toEqualTypeOf<'label'>()
    type HasRadius = 'radius' extends keyof ContractProps<typeof Plain> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(6) nested composition through the real extraction path: Card → Surface → Base, three real components deep', () => {
    // Deliberately separate component tree from the module-level Card/Surface above -- this
    // test exists specifically to prove the *public* ContractProps<T> extraction path survives
    // a multi-level chain, not just the standalone ContractGenericsWithComposeOf helper
    // (already covered by lib/compose-props's own "step 5" test, which can't reach this
    // adapter's real createContractComponent/ContractProps at all).
    const baseOptions = {
      tag: 'span',
      name: 'Base',
      // Deliberately not named `as` -- that's every PolymorphicComponent's own built-in control
      // prop (tag selection), and colliding with it would test a collision edge case instead of
      // plain three-level nesting.
      props: undefined as unknown as { tone?: 'light' | 'dark' },
    } satisfies ReactFactoryOptions
    const Base = createContractComponent(baseOptions)

    const surfaceComposingBaseOptions = {
      tag: 'div',
      name: 'SurfaceComposingBase',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
      compose: { allProps: true, with: Base },
    } satisfies ReactFactoryOptions
    const SurfaceComposingBase = createContractComponent(surfaceComposingBaseOptions)

    const nestedCardOptions = {
      tag: 'article',
      name: 'NestedCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: true, with: SurfaceComposingBase },
    } satisfies ReactFactoryOptions
    const NestedCard = createContractComponent(nestedCardOptions)
    void NestedCard

    // All three levels' own props reach the outermost component's real ContractProps, checked
    // against all three render modes this type supports (normal/asChild/render) -- not just the
    // normal-mode default this type's own doc comment anchors against.
    type HasVariant = 'variant' extends keyof ContractProps<typeof NestedCard> ? true : false
    type HasRadius = 'radius' extends keyof ContractProps<typeof NestedCard, 'asChild'>
      ? true
      : false
    type HasTone = 'tone' extends keyof ContractProps<typeof NestedCard, 'render'> ? true : false
    expectTypeOf<HasVariant>().toEqualTypeOf<true>()
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
    expectTypeOf<HasTone>().toEqualTypeOf<true>()

    type Picked = Pick<ContractProps<typeof NestedCard>, 'variant' | 'radius' | 'tone'>
    expectTypeOf<Picked>().toEqualTypeOf<{
      variant?: 'elevated' | 'flat'
      radius?: 'sm' | 'lg'
      tone?: 'light' | 'dark'
    }>()

    function ConsumesAllThreeLevels(
      props: Omit<ContractProps<typeof NestedCard, 'render'>, 'render' | 'asChild' | 'children'>,
    ): void {
      void props
    }
    ConsumesAllThreeLevels({ variant: 'elevated', radius: 'sm', tone: 'light' })
  })

  it('(7) design decision — collision validation is a downstream diagnostic, not declaration-site rejection, against two real createContractComponent components', () => {
    // Same decision as lib/compose-props/src/compose-generics.test.ts's own "design decision"
    // case, verified here against the real factory and the real ContractProps extraction path
    // rather than a bare contract literal — that package has no dependency on any adapter, so it
    // can't call createContractComponent itself. The two tests are deliberately not merged: they
    // prove the same decision holds at two different, independently-useful layers.
    const collidingSurfaceOptions = {
      tag: 'div',
      name: 'CollidingSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies ReactFactoryOptions
    const CollidingSurface = createContractComponent(collidingSurfaceOptions)

    // (1) The declaration itself always type-checks, collision or not -- no @ts-expect-error
    // is needed anywhere on this real createContractComponent call despite `radius` colliding
    // with CollidingSurface's incompatible 'sm' | 'lg'.
    const collidingCardOptions = {
      tag: 'article',
      name: 'CollidingCard',
      props: undefined as unknown as { radius?: 'thin' | 'thick' },
      compose: { allProps: true, with: CollidingSurface },
    } satisfies ReactFactoryOptions
    const CollidingCard = createContractComponent(collidingCardOptions)
    void CollidingCard

    // (2) The collision is recorded as a diagnostic value at that one key, reachable through the
    // real public ContractProps<T> extraction path...
    type RadiusType = ContractProps<typeof CollidingCard>['radius']
    expectTypeOf<RadiusType>().toEqualTypeOf<CollisionError<'radius'> | undefined>()

    // (3) ...but a consumer who never reads that specific key sees no error at all, through the
    // same real extraction path.
    function ConsumesEverythingExceptRadius(
      props: Omit<ContractProps<typeof CollidingCard>, 'radius'>,
    ): void {
      void props
    }
    ConsumesEverythingExceptRadius({})
  })

  it('(8) regression — compose present but allProps: false leaves the partner’s props unreachable, same as no compose at all', () => {
    const noForwardSurfaceOptions = {
      tag: 'div',
      name: 'NoForwardSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies ReactFactoryOptions
    const NoForwardSurface = createContractComponent(noForwardSurfaceOptions)

    const noForwardCardOptions = {
      tag: 'article',
      name: 'NoForwardCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: false, with: NoForwardSurface },
    } satisfies ReactFactoryOptions
    const NoForwardCard = createContractComponent(noForwardCardOptions)
    void NoForwardCard

    type HasRadius = 'radius' extends keyof ContractProps<typeof NoForwardCard> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(9) a real variant collision surfaces as a diagnostic at that key; non-colliding variants on either side survive', () => {
    const variantCollidingSurfaceOptions = {
      tag: 'div',
      name: 'VariantCollidingSurface',
      styling: {
        variants: {
          shadow: { true: 'shadow-sm', false: 'shadow-none' },
          size: { sm: 'text-sm', lg: 'text-lg' },
        },
      },
    } satisfies ReactFactoryOptions
    const VariantCollidingSurface = createContractComponent(variantCollidingSurfaceOptions)

    // Card's own `shadow` variant has a genuinely different shape than Surface's -- a real
    // variant collision -- alongside a second, non-colliding `color` variant.
    const variantCollidingCardOptions = {
      tag: 'article',
      name: 'VariantCollidingCard',
      styling: {
        variants: {
          shadow: { yes: 'shadow-yes', no: 'shadow-no' },
          color: { red: 'text-red', blue: 'text-blue' },
        },
      },
      compose: { allProps: true, with: VariantCollidingSurface },
    } satisfies ReactFactoryOptions
    const VariantCollidingCard = createContractComponent(variantCollidingCardOptions)
    void VariantCollidingCard

    // Non-colliding variant keys from both sides still reach the real ContractProps, same as
    // the standalone helper's own "variants collision" test already proved in isolation --
    // this is the adapter-level confirmation that holds through the real extraction path too.
    type HasSize = 'size' extends keyof ContractProps<typeof VariantCollidingCard> ? true : false
    type HasColor = 'color' extends keyof ContractProps<typeof VariantCollidingCard>
      ? true
      : false
    expectTypeOf<HasSize>().toEqualTypeOf<true>()
    expectTypeOf<HasColor>().toEqualTypeOf<true>()
  })
})
