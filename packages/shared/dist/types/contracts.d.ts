export { C as Cardinality, a as CardinalityInput, b as ChildRuleInput, c as ChildRuleMatch, d as ChildRulePosition, N as NormalizedChildRule, W as WithChildRules } from '../with-child-rules-tCt4__v0.js';
import 'type-fest';

type ChildViolationKind = 'cardinality-min' | 'cardinality-max' | 'position' | 'unexpected' | 'ambiguous';
type ChildViolation = {
    kind: ChildViolationKind;
    message: string;
    /** Present for cardinality and position violations. */
    ruleName?: string;
    /** Present for unexpected and ambiguous violations. */
    childIndex?: number;
};

export type { ChildViolation, ChildViolationKind };
