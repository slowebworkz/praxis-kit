import type { ChildRuleInput } from '@praxis-kit/core'
import { ChildrenEvaluator } from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type RuntimeEngines = {
  childrenEvaluator?: ChildrenEvaluator
}

export function buildEngines(
  diagnostics: Diagnostics,
  childRules?: readonly ChildRuleInput[],
  context?: string,
): RuntimeEngines {
  return childRules?.length
    ? { childrenEvaluator: new ChildrenEvaluator(childRules, diagnostics, context) }
    : {}
}
