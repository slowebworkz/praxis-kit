import { Merge } from 'type-fest';

type CardinalityInput = {
    min?: number;
    max?: number;
};
/** Unboundedness is encoded in the type, not a sentinel value, enabling exhaustive switches. */
type Cardinality = {
    kind: 'bounded';
    min: number;
    max: number;
} | {
    kind: 'unbounded';
};

type ChildRuleMatch<T, U extends T = T> = (child: T) => child is U;

type ChildRulePosition = 'first' | 'last' | 'any';

type ChildRuleInput<T = unknown, U extends T = T> = {
    name: string;
    match: ChildRuleMatch<T, U>;
    cardinality?: CardinalityInput;
    position?: ChildRulePosition;
    /**
     * Optional component-type reference for O(1) dispatch index.
     * When provided for every rule, the matcher reads child.type instead of
     * calling every match function on every child (O(n×m) → O(n+m)).
     */
    type?: unknown;
};

type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<Merge<ChildRuleInput<T, U>, {
    cardinality: Cardinality;
    position: ChildRulePosition;
}>>;

type WithChildRules = {
    enforcement?: {
        children?: readonly unknown[];
    };
};

export type { Cardinality as C, NormalizedChildRule as N, WithChildRules as W, CardinalityInput as a, ChildRuleInput as b, ChildRuleMatch as c, ChildRulePosition as d };
