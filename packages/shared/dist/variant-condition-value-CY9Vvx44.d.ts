type VariantValue = string | string[];

type VariantStates<K extends string = string> = Record<K, VariantValue>;

type VariantMap<V extends string = string, K extends string = string> = Record<V, VariantStates<K>>;

/**
 * A partial selection of variant states authored at factory definition time.
 *
 * Uses `keyof V[K]` directly (not `VariantKey`) so TypeScript can eagerly
 * resolve the union at constraint-check time without deferred conditional types.
 */
type VariantSelection<V extends VariantMap> = {
    [K in keyof V]?: keyof V[K];
};

/**
 * A static, immutable map of named presets to partial variant selections.
 *
 * Presets are named bundles of variant props that callers activate by key,
 * avoiding the need to repeat variant combinations at each call site.
 */
type PresetMap<V extends VariantMap = VariantMap> = Readonly<Record<string, VariantSelection<V>>>;

type VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>;

export type { PresetMap as P, VariantConditionValue as V, VariantMap as a, VariantSelection as b, VariantStates as c, VariantValue as d };
