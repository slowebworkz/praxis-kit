import type { ChildRuleInput, StrictMode } from '@praxis-ui/core'
import { ChildrenEvaluator } from '@praxis-ui/core'

export function buildEngines(
  strict: StrictMode,
  childRules?: readonly ChildRuleInput[],
  context?: string,
) {
  const childrenEvaluator = childRules?.length
    ? new ChildrenEvaluator(childRules, strict, context)
    : undefined
  return { childrenEvaluator }
}
