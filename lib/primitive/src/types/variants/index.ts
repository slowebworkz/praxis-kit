import type {
  AnyRecord,
  Booleanish,
  ElementType,
  EmptyRecord,
  Numberish,
  Primitive,
} from '../primitives'

export type * from './compound'

export type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T

export type VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>

export type VariantValue = string | string[]

export type VariantStates<K extends string = string> = Record<K, VariantValue>

export type VariantMap<V extends string = string, K extends string = string> = Record<
  V,
  VariantStates<K>
>

export type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<
  keyof V[K] & string
>

/**
 * A partial selection of variant states authored at factory definition time.
 *
 * Uses `keyof V[K]` directly (not `VariantKey`) so TypeScript can eagerly
 * resolve the union at constraint-check time without deferred conditional types.
 */
export type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K]
}

/** The full optional prop surface exposed to callers for a given variant map. */
export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

type NormalizedVariantValue<K extends string> = string extends K
  ? Primitive
  : K extends 'true' | 'false'
    ? Booleanish
    : K extends `${number}`
      ? Numberish
      : K

export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: NormalizedVariantValue<keyof V[K] & string>
}

/**
 * A static, immutable map of named presets to partial variant selections.
 *
 * Presets are named bundles of variant props that callers activate by key,
 * avoiding the need to repeat variant combinations at each call site.
 */
export type RecipeMap<V extends VariantMap = VariantMap> = Readonly<
  Record<string, VariantSelection<V>>
>

export type RecipeTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>

export interface PolymorphicGenerics<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TAllowed extends ElementType = ElementType,
> {
  default: TDefault
  props: Props
  variants: Variants
  preset: TPreset
  allowed: TAllowed
}

export type VariantsOf<T extends PolymorphicGenerics> = T['variants']
export type RecipeOf<T extends PolymorphicGenerics> = T['preset']
export type AllowedOf<T extends PolymorphicGenerics> = T['allowed']
export type DefaultOf<T extends PolymorphicGenerics> = T['default']
export type PropsOf<T extends PolymorphicGenerics> = T['props']
