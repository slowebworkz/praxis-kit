import { C as Cardinality, b as ChildRuleInput, N as NormalizedChildRule, W as WithChildRules } from '../with-child-rules-tCt4__v0.js';
import { V as ValidationResult, a as ValidationViolation } from '../validation-result-DW5Foqkw.js';
import 'type-fest';
import '../severity-D5t9u4XZ.js';

declare function isCardinality(value: unknown): value is Cardinality;

declare function isChildRule(value: unknown): value is ChildRuleInput;
declare function isNormalizedChildRule(value: unknown): value is NormalizedChildRule;

declare function isComponentConstraint(value: unknown): value is WithChildRules;

declare function isValidationViolation(value: unknown): value is ValidationViolation;
declare function isValidationResult(value: unknown): value is ValidationResult;

export { isCardinality, isChildRule, isComponentConstraint, isNormalizedChildRule, isValidationResult, isValidationViolation };
