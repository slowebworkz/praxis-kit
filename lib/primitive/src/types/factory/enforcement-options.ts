import type { ElementType } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  readonly diagnostics?: Diagnostics
  readonly aria?: readonly AriaRule[]
  readonly children?: readonly ChildRuleInput[]
  /**
   * When true, only children matching a `children` rule (or text, per `allowText`)
   * are valid — anything else is rejected. Default: false (open — children not
   * matching any rule are allowed).
   */
  readonly exclusiveChildren?: boolean
  /**
   * When false, text/number child nodes are rejected regardless of exclusiveChildren
   * or any listed rule. Default: true.
   */
  readonly allowText?: boolean
  readonly props?: readonly PropNormalizer[]
  /** Restricts the `as` prop to this set of tags. Violations route through diagnostics. */
  readonly allowedAs?: readonly TAllowed[]
}
