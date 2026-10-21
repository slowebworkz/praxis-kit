import type {
  AllowedOf,
  AnyRecord,
  ChildrenEvaluator,
  ComposeOptions,
  DefaultOf,
  ElementForTag,
  PolymorphicGenerics,
  PropsOf,
} from '@praxis-kit/core'
import type {
  BuiltChildrenEvaluator,
  CompositionClassResolver,
  SlotValidator,
  WithChildRules,
} from '@praxis-kit/adapter-utils'
import type { FilterPredicate } from './primitives'
import type { Runtime, TypedRuntime } from './runtime'

export type { WithChildRules, BuiltChildrenEvaluator }

// `element` is typed to every tag `G`'s default/allowed `as` could actually render — see
// `FactoryOptions.onElement` in @praxis-kit/primitive for the full rationale.
export type OnElementFn<G extends PolymorphicGenerics = PolymorphicGenerics> = (
  element: ElementForTag<DefaultOf<G> | AllowedOf<G>>,
  getProps: () => Readonly<PropsOf<G>>,
) => void | (() => void)

/**
 * Resolves the combined primary + `compose.with` class string for one automatic-composition render.
 * Present only when `compose.with` is a Praxis bundle that retained styling metadata.
 */
export type ResolveComposedClasses = (
  tag: unknown,
  partnerProps: Readonly<AnyRecord>,
  componentProps: Readonly<AnyRecord>,
  callerClass: string | undefined,
  recipe: string | undefined,
) => string | undefined

type ComposeOf<TOptions extends WithChildRules> = TOptions extends {
  readonly compose: infer TCompose
}
  ? TCompose
  : ComposeOptions

export type BuiltRuntime<
  G extends PolymorphicGenerics = PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  compositionClassResolver?: CompositionClassResolver
  /** Plugin-owned keys reserved from host and child prop forwarding. */
  ownedKeys: ReadonlySet<string>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  onElement?: OnElementFn<G>
  compose?: ComposeOf<TOptions>
  resolveComposedClasses?: ResolveComposedClasses
}

// Structural alias used when generic precision is not needed (e.g. as a prop type).
// Uses the structural Runtime supertype rather than TypedRuntime<any> — TypedRuntime<any>
// expands to require classPlugin (from the tailwind overload), breaking assignability.
// All BuiltRuntime<G, TOptions> variants satisfy this shape.
export type AnyBuiltRuntime = {
  runtime: Runtime
  ownedKeys: ReadonlySet<string>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
  onElement?: OnElementFn
  compose?: ComposeOptions
  resolveComposedClasses?: ResolveComposedClasses
}
