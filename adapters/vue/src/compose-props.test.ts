/**
 * Real-component validation for the actual public extraction path, `ContractProps<T>`
 * (`adapters/vue/src/types/polymorphic-props.ts`), now wired to `ContractGenericsWithComposeOf<C>`
 * (`@praxis-kit/compose-props`) instead of plain `ContractGenericsOf<C>` — mirrors
 * `adapters/react/src/current/compose-props.test.tsx`, adapted for Vue's own `ContractProps<T>`
 * shape (no `Mode` parameter — a flat union of both render modes rather than a mode-selected
 * single shape).
 *
 * `satisfies VueFactoryOptions` is not just documentation here, unlike this adapter's other
 * `contract-props.test.ts` (which passes plain objects directly) — confirmed by direct bisection
 * elsewhere in this change that without it, `ContractAllowedOf<C>` resolves differently inside
 * `ContractGenericsWithComposeOf`'s own self-referential conditional than it does for the
 * identical object checked this way (a fresh-literal-vs-checked-literal TypeScript quirk around
 * recursive conditional types). Always author contracts this way when feeding them to
 * `ContractGenericsWithComposeOf` (directly or via `ContractProps`).
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { OmitIndexSignature } from 'type-fest'
import type { VueFactoryOptions } from './vue-options'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, PolymorphicWithAllowedAs } from './types'
import type { CollisionError, ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'

/**
 * Unlike React's/Preact's `ComponentProps<G> = OmitIndexSignature<PropsOf<G>>`, Vue's own
 * `ControlProps`/`NormalProps`/`AsChildProps` (`polymorphic-props.ts`) never strip the index
 * signature `UnknownProps` (`= AnyRecord = Record<string, unknown>`) intersects in — a
 * pre-existing characteristic of this adapter's `ContractProps<T>`, confirmed directly: an
 * unguarded `'radius' extends keyof NamedKeysOf<ContractProps<typeof Plain>>` check returned `true` even for
 * a `Plain` component with no `radius` anywhere, because `keyof Record<string, unknown>` is
 * `string`, and every string trivially extends that. Every `extends keyof` presence check in
 * this file goes through this wrapper first so it actually tests composition, not an
 * always-present index signature. */
type NamedKeysOf<T> = OmitIndexSignature<T>


const surfaceOptions = {
  tag: 'div',
  name: 'Surface',
  props: undefined as unknown as { radius?: 'sm' | 'lg' },
  styling: { variants: { shadow: { true: 'shadow-sm', false: 'shadow-none' } } },
} satisfies VueFactoryOptions
const Surface = createContractComponent(surfaceOptions)

const cardOptions = {
  tag: 'section',
  name: 'Card',
  props: undefined as unknown as { variant?: 'elevated' | 'flat' },
  enforcement: { allowedAs: ['section', 'article'] as const },
  compose: { allProps: true, with: Surface },
} satisfies VueFactoryOptions
const Card = createContractComponent(cardOptions)
void Card
type CardContract = typeof cardOptions

describe('ContractProps<typeof Card> through the real, wired extraction path', () => {
  it('(1) ContractProps<typeof Card> now sees Surface’s forwarded props', () => {
    type HasRadius = 'radius' extends keyof NamedKeysOf<ContractProps<typeof Card>> ? true : false
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

  it('(3a) `as` still only accepts Card’s own default tag through ContractProps, unchanged by composing', () => {
    const asSection: ContractProps<typeof Card>['as'] = 'section'
    void asSection
    // @ts-expect-error — ContractProps narrows `as` to the component's own default tag, the
    // same ceiling PolymorphicProps<G> (single type argument) already has uncomposed
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

  it('(4) a plain, non-composing component’s ContractProps is provably unchanged by this wiring', () => {
    const plainOptions = {
      tag: 'div',
      name: 'Plain',
      props: undefined as unknown as { label?: string },
    } satisfies VueFactoryOptions
    const Plain = createContractComponent(plainOptions)
    void Plain

    type HasOnlyLabel = keyof Pick<ContractProps<typeof Plain>, 'label'>
    expectTypeOf<HasOnlyLabel>().toEqualTypeOf<'label'>()
    type HasRadius = 'radius' extends keyof NamedKeysOf<ContractProps<typeof Plain>> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(5) nested composition through the real extraction path: Card → Surface → Base', () => {
    const baseOptions = {
      tag: 'span',
      name: 'Base',
      props: undefined as unknown as { tone?: 'light' | 'dark' },
    } satisfies VueFactoryOptions
    const Base = createContractComponent(baseOptions)

    const surfaceComposingBaseOptions = {
      tag: 'div',
      name: 'SurfaceComposingBase',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
      compose: { allProps: true, with: Base },
    } satisfies VueFactoryOptions
    const SurfaceComposingBase = createContractComponent(surfaceComposingBaseOptions)

    const nestedCardOptions = {
      tag: 'article',
      name: 'NestedCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: true, with: SurfaceComposingBase },
    } satisfies VueFactoryOptions
    const NestedCard = createContractComponent(nestedCardOptions)
    void NestedCard

    type HasVariant = 'variant' extends keyof NamedKeysOf<ContractProps<typeof NestedCard>> ? true : false
    type HasRadius = 'radius' extends keyof NamedKeysOf<ContractProps<typeof NestedCard>> ? true : false
    type HasTone = 'tone' extends keyof NamedKeysOf<ContractProps<typeof NestedCard>> ? true : false
    expectTypeOf<HasVariant>().toEqualTypeOf<true>()
    expectTypeOf<HasRadius>().toEqualTypeOf<true>()
    expectTypeOf<HasTone>().toEqualTypeOf<true>()
  })

  it('(6) design decision — collision validation is a downstream diagnostic, not declaration-site rejection', () => {
    const collidingSurfaceOptions = {
      tag: 'div',
      name: 'CollidingSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies VueFactoryOptions
    const CollidingSurface = createContractComponent(collidingSurfaceOptions)

    const collidingCardOptions = {
      tag: 'article',
      name: 'CollidingCard',
      props: undefined as unknown as { radius?: 'thin' | 'thick' },
      compose: { allProps: true, with: CollidingSurface },
    } satisfies VueFactoryOptions
    const CollidingCard = createContractComponent(collidingCardOptions)
    void CollidingCard

    type RadiusType = ContractProps<typeof CollidingCard>['radius']
    expectTypeOf<RadiusType>().toEqualTypeOf<CollisionError<'radius'> | undefined>()

    function ConsumesEverythingExceptRadius(
      props: Omit<ContractProps<typeof CollidingCard>, 'radius'>,
    ): void {
      void props
    }
    ConsumesEverythingExceptRadius({})
  })

  it('(7) regression — compose present but allProps: false leaves the partner’s props unreachable, same as no compose at all', () => {
    const noForwardSurfaceOptions = {
      tag: 'div',
      name: 'NoForwardSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies VueFactoryOptions
    const NoForwardSurface = createContractComponent(noForwardSurfaceOptions)

    const noForwardCardOptions = {
      tag: 'article',
      name: 'NoForwardCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: false, with: NoForwardSurface },
    } satisfies VueFactoryOptions
    const NoForwardCard = createContractComponent(noForwardCardOptions)
    void NoForwardCard

    type HasRadius = 'radius' extends keyof NamedKeysOf<ContractProps<typeof NoForwardCard>>
      ? true
      : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(8) a real variant collision surfaces as a diagnostic at that exact key; non-colliding variants on either side keep their real values', () => {
    // Regression: the first version of this test only checked `extends keyof` for the
    // non-colliding keys, which passed even when the underlying bug made the *entire* merged
    // variants object resolve to `never` (not just the colliding key), because `keyof never` is
    // `string | number | symbol` in TypeScript -- see
    // `adapters/react/src/current/compose-props.test.tsx`'s identical fix for the full story.
    const variantCollidingSurfaceOptions = {
      tag: 'div',
      name: 'VariantCollidingSurface',
      styling: {
        variants: {
          shadow: { true: 'shadow-sm', false: 'shadow-none' },
          size: { sm: 'text-sm', lg: 'text-lg' },
        },
      },
    } satisfies VueFactoryOptions
    const VariantCollidingSurface = createContractComponent(variantCollidingSurfaceOptions)

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
    } satisfies VueFactoryOptions
    const VariantCollidingCard = createContractComponent(variantCollidingCardOptions)
    void VariantCollidingCard

    type ShadowType = ContractProps<typeof VariantCollidingCard>['shadow']
    expectTypeOf<ShadowType>().toEqualTypeOf<CollisionError<'shadow'> | undefined>()

    type SizeType = ContractProps<typeof VariantCollidingCard>['size']
    type ColorType = ContractProps<typeof VariantCollidingCard>['color']
    expectTypeOf<SizeType>().toEqualTypeOf<'sm' | 'lg' | undefined>()
    expectTypeOf<ColorType>().toEqualTypeOf<'red' | 'blue' | undefined>()
  })
})
