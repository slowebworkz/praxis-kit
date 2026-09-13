import type { ElementType, EmptyRecord } from '../primitives'
import type { AnyClassPluginFactory } from '../class'
import type { FactoryOptions } from './factory-options'

/**
 * `FactoryOptions`-level accessor family, mirroring `polymorphic-generics.ts`'s `*Of<T>`
 * convention (`DefaultOf<G>`, `PropsOf<G>`, etc.) but applied one layer up, to a contract itself
 * rather than to the `PolymorphicGenerics` an adapter derives from it.
 *
 * Named with a `Contract` prefix specifically to avoid colliding with `polymorphic-generics.ts`'s
 * own `PropsOf`/`VariantsOf`/`RecipeOf`/`AllowedOf`/`DefaultOf` — both families are re-exported
 * from `@praxis-kit/core`, so a name clash would be a real conflict, not a style nit.
 *
 * Each accessor is a conditional-`infer` against `FactoryOptions`'s own type-parameter positions,
 * not a plain property-index alias (`T['tag']`) the way `polymorphic-generics.ts`'s accessors are.
 * `PolymorphicGenerics`'s fields are always required, so indexing is exact, but every
 * `FactoryOptions` field is optional (`tag?`, `styling?`, …), so indexing would recover
 * `TDefault | undefined` instead of the real `TDefault` a caller — most importantly
 * `ContractGenericsOf<C>` — needs to project forward. The other five positions in each
 * conditional are filled with `any`, the same filler role TypeScript's own `Parameters<T>`/
 * `ReturnType<T>` use for "extract one type argument, ignore the rest" — `any` sidesteps having
 * to satisfy each position's real constraint (several of which reference *each other*, e.g.
 * `TPreset extends RecipeMap<V>`), which a same-shaped concrete placeholder can't always do
 * once one of the interdependent positions is itself an unresolved `infer`.
 */
export type ContractTagOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see this type's own doc comment
  C extends FactoryOptions<infer TDefault, any, any, any, any, any> ? TDefault : ElementType

/** This contract's own declared props, before variants are mixed in. See `ContractTagOf`'s doc
 *  comment for why this is a conditional `infer`, not a property-index alias. */
export type ContractPropsOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ContractTagOf's own comment
  C extends FactoryOptions<any, infer Props, any, any, any, any> ? Props : EmptyRecord

/** This contract's variant definitions. See `ContractTagOf`'s doc comment for why this is a
 *  conditional `infer`, not a property-index alias. */
export type ContractVariantsOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ContractTagOf's own comment
  C extends FactoryOptions<any, any, infer V, any, any, any> ? V : Readonly<EmptyRecord>

/** This contract's named presets. See `ContractTagOf`'s doc comment for why this is a conditional
 *  `infer`, not a property-index alias. */
export type ContractPresetOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ContractTagOf's own comment
  C extends FactoryOptions<any, any, any, infer TPreset, any, any> ? TPreset : Readonly<EmptyRecord>

/** This contract's class-resolution plugin (e.g. the Tailwind layout pipeline). See
 *  `ContractTagOf`'s doc comment for why this is a conditional `infer`, not a property-index
 *  alias. */
export type ContractPluginOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ContractTagOf's own comment
  C extends FactoryOptions<any, any, any, any, infer TPlugin, any> ? TPlugin : AnyClassPluginFactory

/** The set of elements/tags this contract allows via `as`. See `ContractTagOf`'s doc comment for
 *  why this is a conditional `infer`, not a property-index alias. */
export type ContractAllowedOf<C extends FactoryOptions> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ContractTagOf's own comment
  C extends FactoryOptions<any, any, any, any, any, infer TAllowed> ? TAllowed : ElementType
