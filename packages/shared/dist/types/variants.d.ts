import { RequireAtLeastOne, Simplify } from 'type-fest';
import { a as EmptyRecord, N as NonEmptyArray, E as ElementType } from '../non-empty-array-lxV9SYLA.js';
import { a as VariantMap, d as VariantValue, P as PresetMap, b as VariantSelection } from '../variant-condition-value-CY9Vvx44.js';
export { V as VariantConditionValue, c as VariantStates } from '../variant-condition-value-CY9Vvx44.js';
import { A as AnyRecord } from '../any-record-CarbE-Qh.js';

type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T;

type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<keyof V[K] & string>;

type RequireAtLeastOneIfNotEmpty<T> = keyof T extends never ? EmptyRecord : RequireAtLeastOne<T>;
type CompoundVariantConditionValue<V extends VariantMap, K extends keyof V> = VariantKey<V, K> | NonEmptyArray<VariantKey<V, K>>;
type CompoundVariantConditions<V extends VariantMap> = Simplify<{
    [K in keyof V]: CompoundVariantConditionValue<V, K>;
}>;
type CompoundVariantRequiredConditions<V extends VariantMap> = RequireAtLeastOneIfNotEmpty<CompoundVariantConditions<V>>;
type CompoundVariantBase<V extends VariantMap> = keyof V extends never ? EmptyRecord : CompoundVariantRequiredConditions<V>;
type CompoundVariant<V extends VariantMap> = CompoundVariantBase<V> & {
    class: VariantValue;
};

interface CVACompounds<V extends VariantMap> {
    compoundVariants?: readonly CompoundVariant<V>[];
}

/** The full optional prop surface exposed to callers for a given variant map. */
type VariantProps<V extends VariantMap> = {
    [K in keyof V]?: VariantKey<V, K>;
};
type DefaultVariants<V extends VariantMap> = {
    [K in keyof V]?: VariantKey<V, K>;
};

interface CVADefaults<V extends VariantMap> {
    defaultVariants?: DefaultVariants<V>;
}

interface CVAVariants<V extends VariantMap> {
    variants?: V;
}

type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>;

interface PolymorphicGenerics<TDefault extends ElementType = ElementType, Props extends AnyRecord = AnyRecord, Variants extends Readonly<VariantMap> = Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>> {
    default: TDefault;
    props: Props;
    variants: Variants;
    preset: TPreset;
}
type VariantsOf<T extends PolymorphicGenerics> = T['variants'];
type PresetOf<T extends PolymorphicGenerics> = T['preset'];

type PresetTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>;

export { type CVACompounds, type CVAConfig, type CVADefaults, type CVAVariants, type CompoundVariant, type DefaultVariants, type PolymorphicGenerics, PresetMap, type PresetOf, type PresetTarget, type StringToBoolean, type VariantKey, VariantMap, type VariantProps, VariantSelection, VariantValue, type VariantsOf };
