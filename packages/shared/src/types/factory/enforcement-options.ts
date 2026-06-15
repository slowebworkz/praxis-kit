import type { ElementType } from '../primitives'
import type { StrictMode } from '../config'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  readonly strict?: StrictMode
  readonly aria?: readonly AriaRule[]
  readonly children?: readonly ChildRuleInput[]
  readonly props?: readonly PropNormalizer[]
  /** Restricts the `as` prop to this set of tags. Violations route through strict mode. */
  readonly allowedAs?: readonly TAllowed[]
}
