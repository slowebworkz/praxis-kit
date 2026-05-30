import type { ChildRuleInput, StrictMode } from '@praxis-ui/core'
import { ChildrenEvaluator } from '@praxis-ui/core'

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
