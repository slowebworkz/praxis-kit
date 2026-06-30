import type { ElementType } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  readonly diagnostics?: Diagnostics
  readonly aria?: readonly AriaRule[]
  readonly children?: readonly ChildRuleInput[]
  readonly props?: readonly PropNormalizer[]
  /** Restricts the `as` prop to this set of tags. Violations route through diagnostics. */
  readonly allowedAs?: readonly TAllowed[]
}
