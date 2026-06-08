import type { ChildRuleInput, StrictMode } from '@praxis-kit/core'
import { ChildrenEvaluator } from '@praxis-kit/core'

export type RuntimeEngines = {
  childrenEvaluator?: ChildrenEvaluator
}

export function buildEngines(
  strict: StrictMode,
  childRules?: readonly ChildRuleInput[],
  context?: string,
): RuntimeEngines {
  return childRules?.length
    ? { childrenEvaluator: new ChildrenEvaluator(childRules, strict, context) }
    : {}
}
