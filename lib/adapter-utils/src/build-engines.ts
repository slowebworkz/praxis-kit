import type { ChildRuleInput, StrictMode } from '@polymorphic-ui/core'
import { ChildrenEvaluator } from '@polymorphic-ui/core'

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
