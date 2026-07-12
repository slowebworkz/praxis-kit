import type { ChildRuleInput } from '@praxis-kit/core'
import { ChildrenEvaluator } from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type RuntimeEngines = {
  childrenEvaluator?: ChildrenEvaluator
}

export type BuildEnginesChildrenOptions = {
  readonly exclusiveChildren?: boolean | undefined
  readonly allowText?: boolean | undefined
}

export function buildEngines(
  diagnostics: Diagnostics,
  childRules?: readonly ChildRuleInput[],
  context?: string,
  childrenOptions?: BuildEnginesChildrenOptions,
): RuntimeEngines {
  const { exclusiveChildren, allowText } = childrenOptions ?? {}
  return childRules?.length || exclusiveChildren || allowText === false
    ? {
        childrenEvaluator: new ChildrenEvaluator(childRules ?? [], diagnostics, context, {
          exclusiveChildren,
          allowText,
        }),
      }
    : {}
}
