import type { Diagnostics } from '@praxis-kit/diagnostics'
import type {
  AnyRecord,
  ElementForTag,
  ElementType,
  EmptyRecord,
  IntrinsicProps,
  SubComponentMap,
} from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'
import type { AnyClassPluginFactory } from '../class'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'
import type { PropNormalizer } from './prop-normalizer'

export type { PropNormalizer }

// method-signature form gives bivariant assignability so NormalizeFn<Props> flows across adapter boundaries
export type NormalizeFn<Props extends AnyRecord = AnyRecord> = {
  normalize(props: Readonly<Props & IntrinsicProps>): Props & IntrinsicProps
}['normalize']

/**
 * The framework-neutral component-authoring config passed to `createContractComponent` in every
 * adapter: default tag + name, own-prop defaults, a `normalize` transform, `styling` (variants,
 * base classes, presets, class plugin), `enforcement` (ARIA + children contracts), `subComponents`,
 * and `onElement`.
 *
 * `satisfies FactoryOptions<TDefault, Props, typeof variants, ...>` on a config object narrows
 * `styling.compounds` conditions to the real per-variant-key shape — including resolving a
 * boolean-shaped axis (`{ true, false }`) to a real `boolean` — so a condition naming a variant or
 * value that does not exist is a compile error. Leaving `V` at the bare `VariantMap` instead
 * (whether via `FactoryOptions`'s own default or an explicit erased instantiation) forgets that
 * shape entirely, so the same invalid condition becomes a silent no-op instead.
 */
export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> = {
  /** The intrinsic tag the component renders by default. Overridable per instance via `as`. */
  readonly tag?: TDefault
  /** Display name used in diagnostics, dev tools, and generated component naming. */
  readonly name?: string
  /** Values used for the component's own (non-variant) props when the consumer omits them. */
  readonly defaults?: Partial<NoInfer<Props>>
  /**
   * Optional, type-only declaration of this component's complete own-prop shape — present purely
   * for type recovery, never read at runtime (see `declareProps` in `@praxis-kit/adapter-utils`).
   *
   * `defaults` alone can only prove a prop *has a default*, not that it's the complete prop model
   * a component accepts — a `defaults: { size: 'md' }` component may still take `onClick`,
   * `disabled`, and other props with no default at all, none of which a `defaults`-only recovery
   * can see (see `ContractPropsFrom`'s own doc comment for the general shape of this problem).
   * `props` closes that gap: when present, `ContractPropsOf<C>` / `ContractProps<typeof Component>`
   * recover this declared type directly and exactly, in place of the necessarily-partial,
   * literal-widened recovery `defaults` alone allows.
   *
   * Typed as `object | undefined`, not `NoInfer<Props> | undefined` like `defaults`/`onElement` —
   * deliberately decoupled from this interface's own `Props` generic, unlike those two fields.
   * `defaults`/`onElement` are tied to `Props` because real runtime code reads them against a
   * concretely-resolved `Props` for a real call; `props` is never read at runtime at all (see
   * above), so it has no such need, and tying it to `Props extends AnyRecord` would force every
   * hand-declared prop `interface`/`type` an author passes through `declareProps<Props>()` to
   * structurally satisfy `Record<string, unknown>` — a real TypeScript limitation (a named type
   * without an index signature never satisfies that, even via plain assignment, only a fresh
   * object literal does) that would make this field far more awkward to use for its one real job:
   * carrying an author's own already-precise prop type through untouched. `ContractPropsFrom`
   * (`contract-model.ts`) recovers the real value here structurally, straight off `O`'s own
   * literal type — independent of this field's declared type, same as every other `Contract*From`
   * derivation in that file.
   */
  readonly props?: object | undefined
  /**
   * A pure `(props) => props` transform run on every render, after `enforcement.props`'s
   * normalizers see the same input. Use this for component-specific prop shaping — anything
   * that depends on live instance state or the real DOM element belongs in `onElement` instead.
   *
   * Accepts either a single transform or an array of them, mirroring the `enforcement.props`
   * array convention. An array is composed left to right — each entry receives the previous
   * entry's *complete* output, not a merged patch — so unlike an `enforcement.props` normalizer
   * (which returns a partial patch), a later `normalize` entry can also remove a key an earlier
   * one added. An empty array is treated as no transform.
   */
  readonly normalize?: NormalizeFn<NoInfer<Props>> | ReadonlyArray<NormalizeFn<NoInfer<Props>>>
  /** Variant groups, base classes, presets, and the optional class-resolution plugin. */
  readonly styling?: StylingOptions<V, TPreset, TPlugin>
  /** ARIA rules, child-content contracts, and other runtime validation for this component. */
  readonly enforcement?: EnforcementOptions<TAllowed>
  /**
   * Adapter-resolved diagnostics default, spread in by `resolveAdapterCommonOptions`. Not meant to
   * be set directly by component authors — use `enforcement.diagnostics` to override per component.
   */
  readonly diagnostics?: Diagnostics
  /**
   * Sub-components to attach to the generated root component, producing a
   * compound component API (for example, `Card.Header`, `Card.Content`,
   * and `Card.Footer`). Purely additive — has no effect on
   * `enforcement.children`; author child rules explicitly if the component
   * needs to validate its children.
   */
  readonly subComponents?: SubComponentMap
  /**
   * Called once per instance, when the real underlying DOM element first
   * exists, in every adapter — via that adapter's own native mount
   * lifecycle, never through the props/attribute pipeline. Use this for
   * wiring that needs the actual element (native imperative methods like
   * `dialogEl.showModal()`, native events like `close`/`cancel` that have
   * no prop-based equivalent), not for anything expressible as a plain
   * prop.
   *
   * `element` is typed to the real DOM interface of every tag the rendered
   * element could actually be — `TDefault` plus whatever `enforcement.allowed`
   * permits via `as` (`HTMLDialogElement` for `tag: 'dialog'`,
   * `HTMLDetailsElement` for `tag: 'details'`, and so on) — no cast needed to
   * reach tag-specific members. A component that leaves `allowed`
   * unconstrained (any tag reachable via `as`) falls back to `HTMLElement`,
   * which still covers members every element shares (`showPopover()` and
   * friends); restrict `enforcement.allowed` to the tags `onElement`
   * actually knows how to handle to get real narrowing.
   *
   * `getProps` returns the instance's *current* resolved props at call
   * time — read it from inside a listener registered once at mount, rather
   * than re-subscribing on every prop change.
   *
   * Return a cleanup function to run when the instance unmounts.
   */
  // method-signature form gives bivariant assignability — same fix, same reason as `NormalizeFn`
  // above: without it, a concrete contract (non-default `TAllowed`/`Props`) fails structural
  // assignability against a *defaulted* `FactoryOptions<...>` instantiation (e.g. `defineContract`'s
  // `ContractInput<Props>` bound), since a plain arrow-property type-checks `onElement`'s parameters
  // contravariantly.
  readonly onElement?: {
    onElement(
      element: ElementForTag<TDefault | TAllowed>,
      getProps: () => Readonly<Props>,
    ): void | (() => void)
  }['onElement']
}
