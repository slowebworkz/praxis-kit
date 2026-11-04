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
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import type { PreactFactoryOptions } from './preact-options'
import { createContractComponent } from './create-contract-component'
import type { ContractInputProps, ContractProps, PolymorphicWithAllowedAs } from './types'
import type { CollisionError, ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'

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
void Card
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
    void Plain

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
    void NestedCard

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

  it('(8) regression — compose present but allProps: false leaves the partner’s props unreachable, same as no compose at all', () => {
    const noForwardSurfaceOptions = {
      tag: 'div',
      name: 'NoForwardSurface',
      props: undefined as unknown as { radius?: 'sm' | 'lg' },
    } satisfies PreactFactoryOptions
    const NoForwardSurface = createContractComponent(noForwardSurfaceOptions)

    const noForwardCardOptions = {
      tag: 'article',
      name: 'NoForwardCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: false, with: NoForwardSurface },
    } satisfies PreactFactoryOptions
    const NoForwardCard = createContractComponent(noForwardCardOptions)
    void NoForwardCard

    type HasRadius = 'radius' extends keyof ContractProps<typeof NoForwardCard> ? true : false
    expectTypeOf<HasRadius>().toEqualTypeOf<false>()
  })

  it('(9) ContractInputProps describes the primary contract, not composed extraction props', () => {
    const pluginPartnerOptions = {
      tag: 'div',
      name: 'PluginInputPartner',
      styling: { base: '', plugin: createTailwindPipeline },
    } satisfies PreactFactoryOptions
    const PluginInputPartner = createContractComponent(pluginPartnerOptions)
    const primaryOptions = {
      tag: 'article',
      name: 'PrimaryInputContract',
      props: undefined as unknown as { own?: boolean },
      compose: { allProps: true, with: PluginInputPartner },
    } satisfies PreactFactoryOptions
    const PrimaryInputContract = createContractComponent(primaryOptions)

    void PrimaryInputContract
    type InputProps = ContractInputProps<typeof PrimaryInputContract>
    type ExtractedProps = ContractProps<typeof PrimaryInputContract>
    expectTypeOf<'own' extends keyof InputProps ? true : false>().toEqualTypeOf<true>()
    expectTypeOf<'flex' extends keyof InputProps ? true : false>().toEqualTypeOf<false>()
    expectTypeOf<'flex' extends keyof ExtractedProps ? true : false>().toEqualTypeOf<true>()
  })

  it('(10) a real variant collision surfaces as a diagnostic at that exact key; non-colliding variants on either side keep their real values', () => {
    // Regression: the first version of this test only checked `extends keyof ContractProps<T>`
    // for the non-colliding keys, which passed even when the underlying bug made the *entire*
    // merged variants object resolve to `never` (not just the colliding key), because `keyof
    // never` is `string | number | symbol` in TypeScript -- see
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
    } satisfies PreactFactoryOptions
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
    } satisfies PreactFactoryOptions
    const VariantCollidingCard = createContractComponent(variantCollidingCardOptions)
    void VariantCollidingCard

    type ShadowType = ContractProps<typeof VariantCollidingCard>['shadow']
    // The primary's own values stay usable; the collision is still surfaced in the prop type, and
    // the partner's conflicting values are not accepted.
    expectTypeOf<ShadowType>().toEqualTypeOf<'yes' | 'no' | CollisionError<'shadow'> | undefined>()

    type SizeType = ContractProps<typeof VariantCollidingCard>['size']
    type ColorType = ContractProps<typeof VariantCollidingCard>['color']
    expectTypeOf<SizeType>().toEqualTypeOf<'sm' | 'lg' | undefined>()
    expectTypeOf<ColorType>().toEqualTypeOf<'red' | 'blue' | undefined>()
  })

  it('(12) a ContractInputProps value can be spread back into the component', () => {
    const LayoutCard = createContractComponent({
      tag: 'article',
      name: 'SpreadLayoutCard',
      styling: { base: '', plugin: createTailwindPipeline },
    } satisfies PreactFactoryOptions)
    const input: ContractInputProps<typeof LayoutCard> = { flex: true }
    const _spread = <LayoutCard {...input} />
    void _spread

    // @ts-expect-error — the strict input still rejects two display props at once.
    const _both: ContractInputProps<typeof LayoutCard> = { flex: true, grid: true }
    void _both
  })

  it('(11) a partner-owned plugin union is flattened in normal and asChild modes', () => {
    const LayoutSurface = createContractComponent({
      tag: 'div',
      name: 'FlatPartnerSurface',
      styling: { base: '', plugin: createTailwindPipeline },
    } satisfies PreactFactoryOptions)
    const FlatPartnerCard = createContractComponent({
      tag: 'article',
      name: 'FlatPartnerCard',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: true, with: LayoutSurface },
    } satisfies PreactFactoryOptions)

    void FlatPartnerCard
    type Normal = ContractProps<typeof FlatPartnerCard>
    type AsChild = ContractProps<typeof FlatPartnerCard, 'asChild'>

    expectTypeOf<Pick<Normal, 'flex' | 'grid' | 'variant'>>().toEqualTypeOf<{
      flex?: true
      grid?: true
      variant?: 'elevated' | 'flat'
    }>()
    expectTypeOf<Omit<Normal, 'flex'>['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<AsChild['flex']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<AsChild['asChild']>().toEqualTypeOf<true>()

    // Flattened, not a union: both keys together are a valid extracted shape.
    const _both: Normal = { flex: true, grid: true }
    void _both
  })
})
