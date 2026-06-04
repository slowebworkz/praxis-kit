import type { StrictMode } from '../config'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'

export type EnforcementOptions = {
  readonly strict?: StrictMode
  readonly aria?: readonly AriaRule[]
  readonly children?: readonly ChildRuleInput[]
}
