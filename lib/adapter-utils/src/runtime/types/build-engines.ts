import type { ChildrenEvaluator } from '@praxis-kit/core'

export type RuntimeEngines = {
  childrenEvaluator?: ChildrenEvaluator
}

export type BuildEnginesChildrenOptions = {
  readonly exclusiveChildren?: boolean | undefined
  readonly allowText?: boolean | undefined
}
