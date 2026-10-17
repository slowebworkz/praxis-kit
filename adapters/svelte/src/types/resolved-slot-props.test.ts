/**
 * Compile-time regression tests for `ResolvedSlotProps<G>`/`GenericsOf<T>`
 * (`resolved-slot-props.ts`). Confirms a real bundle's `G` and original options are recoverable from
 * its own value type, including composition-aware props/variants, and that the resulting
 * `ResolvedSlotProps<G>` is a real, usable shape a snippet can be typed against — replacing the
 * bare `Record<string, unknown>` `createRawSnippet<[Record<string, unknown>]>(...)` calls used
 * elsewhere in this adapter's tests (e.g. `Polymorphic.test.ts`) before this type existed.
 *
 * No runtime assertions — `expectTypeOf`/`@ts-expect-error` only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import { createRawSnippet } from 'svelte'
import type {
  ComponentReference,
  DefaultOf,
  PropsOf,
  RecipeOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { CollisionError } from '@praxis-kit/compose-props'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import type { LayoutKeyName } from '@praxis-kit/tailwind'
import type { OptionalKeysOf } from 'type-fest'
import { createContractComponent } from '../create-contract-component'
import type { AnyBuiltRuntime } from './built-runtime'
import type { GenericsOf, ResolvedSlotProps } from './resolved-slot-props'

describe('GenericsOf<T> composition projection', () => {
  it('includes partner props and variants only when allProps is true', () => {
    const partner = createContractComponent({
      tag: 'button',
      defaults: { partnerOnlyProp: 'partner' },
      styling: { variants: { partnerTone: { calm: 'calm', bright: 'bright' } } },
    })
    const composed = createContractComponent({
      tag: 'div',
      defaults: { ownOnlyProp: 'own' },
      styling: { variants: { ownTone: { quiet: 'quiet', loud: 'loud' } } },
      compose: { with: partner as typeof partner & ComponentReference, allProps: true },
    })
    const notForwarding = createContractComponent({
      tag: 'div',
      defaults: { ownOnlyProp: 'own' },
      styling: { variants: { ownTone: { quiet: 'quiet', loud: 'loud' } } },
      compose: { with: partner as typeof partner & ComponentReference },
    })
    const explicitlyFalse = createContractComponent({
      tag: 'div',
      defaults: { ownOnlyProp: 'own' },
      styling: { variants: { ownTone: { quiet: 'quiet', loud: 'loud' } } },
      compose: { with: partner as typeof partner & ComponentReference, allProps: false },
    })
    // The bundle values are used only in type queries below; keep an explicit value use so ESLint
    // does not report these intentionally type-only fixtures as unused variables.
    void composed
    void notForwarding
    void explicitlyFalse

    type ComposedProps = PropsOf<GenericsOf<typeof composed>>
    type ComposedVariants = VariantsOf<GenericsOf<typeof composed>>
    type ComposedSlotProps = ResolvedSlotProps<GenericsOf<typeof composed>>
    type NotForwardingProps = PropsOf<GenericsOf<typeof notForwarding>>
    type NotForwardingVariants = VariantsOf<GenericsOf<typeof notForwarding>>
    type ExplicitlyFalseProps = PropsOf<GenericsOf<typeof explicitlyFalse>>
    type ExplicitlyFalseVariants = VariantsOf<GenericsOf<typeof explicitlyFalse>>

    expectTypeOf<ComposedProps>().toHaveProperty('ownOnlyProp')
    expectTypeOf<ComposedProps>().toHaveProperty('partnerOnlyProp')
    expectTypeOf<ComposedVariants>().toHaveProperty('ownTone')
    expectTypeOf<ComposedVariants>().toHaveProperty('partnerTone')
    expectTypeOf<ComposedSlotProps>().toHaveProperty('partnerOnlyProp')
    expectTypeOf<ComposedSlotProps>().toHaveProperty('partnerTone')
    expectTypeOf<ComposedSlotProps['partnerTone']>().toEqualTypeOf<'calm' | 'bright' | undefined>()

    // Omitting allProps and setting it explicitly to false both preserve the original own-only
    // type surface. Keep both cases covered: omission is the documented default, while false is
    // an explicit opt-out that must not accidentally become truthy during type inference.
    expectTypeOf<NotForwardingProps>().toHaveProperty('ownOnlyProp')
    expectTypeOf<NotForwardingVariants>().toHaveProperty('ownTone')
    expectTypeOf<ExplicitlyFalseProps>().toHaveProperty('ownOnlyProp')
    expectTypeOf<ExplicitlyFalseVariants>().toHaveProperty('ownTone')
    expectTypeOf<
      'partnerOnlyProp' extends keyof NotForwardingProps ? true : false
    >().toEqualTypeOf<false>()
    expectTypeOf<
      'partnerTone' extends keyof NotForwardingVariants ? true : false
    >().toEqualTypeOf<false>()
    expectTypeOf<
      'partnerOnlyProp' extends keyof ExplicitlyFalseProps ? true : false
    >().toEqualTypeOf<false>()
    expectTypeOf<
      'partnerTone' extends keyof ExplicitlyFalseVariants ? true : false
    >().toEqualTypeOf<false>()
  })

  it('preserves member-specific keys when composing union-shaped props', () => {
    const partner = createContractComponent({
      tag: 'button',
      props: undefined as unknown as { partnerOnlyProp: string },
    })
    const composed = createContractComponent({
      tag: 'div',
      props: undefined as unknown as
        { flex: true; flexOnlyProp: string } | { grid: true; gridOnlyProp: number },
      compose: { with: partner as typeof partner & ComponentReference, allProps: true },
    })
    void composed

    type ComposedProps = PropsOf<GenericsOf<typeof composed>>
    type ComposedSlotProps = ResolvedSlotProps<GenericsOf<typeof composed>>

    // Each union member must retain its own keys after index signatures are stripped and the
    // partner's props are merged. Applying OmitIndexSignature to the union as a whole loses these.
    type FlexProps = Extract<ComposedProps, { flex: true }>
    type GridProps = Extract<ComposedProps, { grid: true }>

    expectTypeOf<FlexProps>().not.toBeNever()
    expectTypeOf<FlexProps>().toHaveProperty('flexOnlyProp')
    expectTypeOf<FlexProps>().toHaveProperty('partnerOnlyProp')
    expectTypeOf<GridProps>().not.toBeNever()
    expectTypeOf<GridProps>().toHaveProperty('gridOnlyProp')
    expectTypeOf<GridProps>().toHaveProperty('partnerOnlyProp')

    // Resolved slot props are the final snippet-facing extraction path; keep this assertion here
    // while the next flattening check determines whether union-specific keys need a flat shape.
    expectTypeOf<ComposedSlotProps>().not.toBeNever()
  })

  it('projects only the direct partner’s own props and variants', () => {
    const leaf = createContractComponent({
      tag: 'button',
      defaults: { leafOnlyProp: 'leaf' },
      styling: { variants: { leafTone: { soft: 'soft', strong: 'strong' } } },
    })
    const middle = createContractComponent({
      tag: 'span',
      defaults: { middleOnlyProp: 'middle' },
      styling: { variants: { middleTone: { soft: 'soft', strong: 'strong' } } },
      compose: { with: leaf as typeof leaf & ComponentReference, allProps: true },
    })
    const root = createContractComponent({
      tag: 'div',
      defaults: { rootOnlyProp: 'root' },
      compose: { with: middle as typeof middle & ComponentReference, allProps: true },
    })
    void root

    type RootProps = PropsOf<GenericsOf<typeof root>>
    type RootVariants = VariantsOf<GenericsOf<typeof root>>

    expectTypeOf<RootProps>().toHaveProperty('rootOnlyProp')
    expectTypeOf<RootProps>().toHaveProperty('middleOnlyProp')
    expectTypeOf<RootVariants>().toHaveProperty('middleTone')

    // The Svelte runtime composes root with middle, but does not recursively render middle's
    // partner. Leaf props/variants therefore must not appear in root's effective type surface.
    expectTypeOf<'leafOnlyProp' extends keyof RootProps ? true : false>().toEqualTypeOf<false>()
    expectTypeOf<'leafTone' extends keyof RootVariants ? true : false>().toEqualTypeOf<false>()
  })

  it('preserves the composing bundle’s default tag, variants, and preset', () => {
    const partner = createContractComponent({
      tag: 'button',
      defaults: { partnerOnlyProp: 'partner' },
      styling: { variants: { partnerTone: { calm: 'calm', bright: 'bright' } } },
    })
    const composed = createContractComponent({
      tag: 'div',
      defaults: { ownOnlyProp: 'own' },
      styling: {
        variants: { ownTone: { quiet: 'quiet', loud: 'loud' } },
        presets: { compact: { ownTone: 'quiet' } },
      },
      compose: { with: partner as typeof partner & ComponentReference, allProps: true },
    })
    void composed

    type ComposedGenerics = GenericsOf<typeof composed>

    expectTypeOf<DefaultOf<ComposedGenerics>>().toEqualTypeOf<'div'>()
    expectTypeOf<VariantsOf<ComposedGenerics>>().toHaveProperty('partnerTone')
    expectTypeOf<RecipeOf<ComposedGenerics>>().toHaveProperty('compact')
  })

  it('uses the shared merge policy for incompatible same-name own props', () => {
    const partner = createContractComponent({
      tag: 'button',
      props: undefined as unknown as {
        shared: 'partner' | 'common'
        partnerOnlyProp: string
        partnerOptional?: number
      },
      styling: { variants: { tone: { partner: 'partner-tone' } } },
    })
    const composed = createContractComponent({
      tag: 'div',
      props: undefined as unknown as {
        shared: 'own' | 'common'
        ownOnlyProp: string
        ownOptional?: boolean
      },
      styling: { variants: { tone: { own: 'own-tone' } } },
      compose: { with: partner as typeof partner & ComponentReference, allProps: true },
    })
    void composed

    type ComposedGenerics = GenericsOf<typeof composed>
    type ComposedProps = PropsOf<ComposedGenerics>
    type ComposedVariants = VariantsOf<ComposedGenerics>

    expectTypeOf<ComposedProps['shared']>().toEqualTypeOf<CollisionError<'shared'>>()
    expectTypeOf<ComposedProps>().toHaveProperty('ownOnlyProp')
    expectTypeOf<ComposedProps>().toHaveProperty('partnerOnlyProp')
    expectTypeOf<OptionalKeysOf<ComposedProps>>().toEqualTypeOf<'ownOptional' | 'partnerOptional'>()
    expectTypeOf<VariantProps<ComposedVariants>['tone']>().toEqualTypeOf<
      CollisionError<'tone'> | undefined
    >()
  })
})

describe('GenericsOf<T>', () => {
  it('recovers a real bundle’s own props, not the widest PolymorphicGenerics fallback', () => {
    // `Props` is recovered from `defaults` (`ContractPropsOf<C>`, Phase 0/1 of the `defineContract`
    // refactor), not from an explicit `Props` generic argument — `createContractComponent` dropped
    // that parameter entirely (see its own doc comment / DECISIONS.md: no real call site ever
    // supplied `Props` alone, and `const O`'s literal-preserving inference only engages with zero
    // explicit type arguments — matching every other adapter's identical fix).
    const buttonBundle = createContractComponent({
      tag: 'button',
      defaults: { type: 'button' },
    })
    void buttonBundle
    type ButtonG = GenericsOf<typeof buttonBundle>
    type SlotProps = ResolvedSlotProps<ButtonG>

    expectTypeOf<SlotProps>().not.toBeNever()
    expectTypeOf<SlotProps>().toHaveProperty('type')
    expectTypeOf<SlotProps>().toHaveProperty('class')
    expectTypeOf<SlotProps['class']>().toEqualTypeOf<string | undefined>()
  })

  it('recovers the exact G, not merely some PolymorphicGenerics — checked against PropsOf directly', () => {
    // A distinctive property PropsOf<PolymorphicGenerics> (the widest fallback) could never have,
    // so this only passes if GenericsOf<T> actually threaded the real, specific G through the
    // conditional-type inference rather than silently falling back. Declared via `defaults` (see
    // the test above) rather than an explicit generic — `true` widens to `boolean` via
    // `ContractPropsFrom`'s own `WidenShallow` step, which is fine: this test only needs the
    // property to exist, not to be the narrow literal `true`.
    const cardBundle = createContractComponent({
      tag: 'div',
      defaults: { distinctiveOwnProp: true },
    })
    void cardBundle
    type CardProps = PropsOf<GenericsOf<typeof cardBundle>>

    expectTypeOf<CardProps>().toHaveProperty('distinctiveOwnProp')
  })

  it('falls back to the widest PolymorphicGenerics for a non-praxis-kit bundle, not never', () => {
    // The regression this guards against: BuiltRuntime<G, TOptions>'s conditional inference
    // silently breaking and collapsing to `never` — which would only surface the moment someone
    // tries to annotate a snippet with it, nowhere near where the actual breakage occurred.
    type Fallback = GenericsOf<AnyBuiltRuntime>

    expectTypeOf<Fallback>().not.toBeNever()
  })
})

describe('ResolvedSlotProps<G>', () => {
  it('is mechanically free of ref/role/style, not merely by doc-comment claim', () => {
    // buildSlotProps (Polymorphic.svelte) genuinely forwards these at runtime when present —
    // this only proves they're absent from the TYPE, matching the documented reasoning in
    // resolved-slot-props.ts (every representation is either unsafe to spread or misrepresents
    // what the runtime actually forwards). A caller who needs one still can, via an explicit,
    // locally-scoped cast — this test guards the omission itself, not reachability workarounds.
    type SlotProps = ResolvedSlotProps<GenericsOf<AnyBuiltRuntime>>

    expectTypeOf<SlotProps>().not.toHaveProperty('ref')
    expectTypeOf<SlotProps>().not.toHaveProperty('role')
    expectTypeOf<SlotProps>().not.toHaveProperty('style')
  })

  it('types a real createRawSnippet call, replacing a bare Record<string, unknown>', () => {
    const buttonBundle = createContractComponent({ tag: 'button' })
    void buttonBundle

    // Previously this call site's only option was
    // createRawSnippet<[Record<string, unknown>]>(...) — no type checking on the snippet
    // parameter at all. This must compile with the real, recovered shape instead.
    const _children = createRawSnippet<[ResolvedSlotProps<GenericsOf<typeof buttonBundle>>]>(
      (getProps) => ({
        render: () => `<a href="/foo">${String(getProps().class ?? '')}</a>`,
      }),
    )
    void _children
  })
})

describe('ResolvedSlotProps<T> layout-union collapse', () => {
  const partner = createContractComponent({
    tag: 'button',
    defaults: { partnerOnlyProp: 'partner' },
  })
  const composed = createContractComponent({
    tag: 'div',
    defaults: { 'data-slot': 'box' },
    styling: { base: 'gap-2', plugin: createTailwindPipeline },
    compose: { with: partner as typeof partner & ComponentReference, allProps: true },
  })
  void composed

  type Props = ResolvedSlotProps<GenericsOf<typeof composed>>

  it('collapses Tailwind layout unions into optional true-valued keys for snippets', () => {
    expectTypeOf<Props['flex']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Props['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Props['data-slot']>().toEqualTypeOf<string | number | boolean | undefined>()
    expectTypeOf<Props['partnerOnlyProp']>().toEqualTypeOf<string | undefined>()

    type WithoutLayout = Omit<Props, LayoutKeyName>
    type OnlyGrid = Pick<Props, 'grid'>
    type Merged = Props & { extra?: string }

    expectTypeOf<WithoutLayout['data-slot']>().toEqualTypeOf<string | number | boolean | undefined>()
    expectTypeOf<OnlyGrid['grid']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Merged['extra']>().toEqualTypeOf<string | undefined>()

    function readProps(props: Props): void {
      const { 'data-slot': _slot, flex: _flex, ...rest } = props
      expectTypeOf(rest).toBeObject()
    }
    void readProps
  })
})
