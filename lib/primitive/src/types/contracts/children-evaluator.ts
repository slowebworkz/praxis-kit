import type { ChildRuleContext } from './child-rule-context'

/** Structural counterpart to the runtime `ChildrenEvaluator` class — `lib/primitive`
 *  may not depend on `lib/contract` (the layer boundary `eslint-plugin-boundaries` enforces via
 *  `configs/architecture.ts`), so this describes only the shape consumers actually call. Mirrors
 *  `AriaEngine`'s pattern. */
export type ChildrenEvaluator = {
  evaluate: (children: unknown[], context?: ChildRuleContext) => void
}
