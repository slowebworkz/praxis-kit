import type { ChildRuleInput, StrictMode } from '@praxis-kit/core'
import { ChildrenEvaluator } from '@praxis-kit/core'
import { diagnosticsFromStrictMode } from '@praxis-kit/core/contract'

export type RuntimeEngines = {
  childrenEvaluator?: ChildrenEvaluator
}

export function buildEngines(
  strict: StrictMode,
  childRules?: readonly ChildRuleInput[],
  context?: string,
): RuntimeEngines {
  return childRules?.length
    ? {
        childrenEvaluator: new ChildrenEvaluator(
          childRules,
          diagnosticsFromStrictMode(strict),
          context,
        ),
      }
    : {}
}
