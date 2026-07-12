import type { ElementType } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'
import type { Diagnostics, DiagnosticsMode } from '@praxis-kit/diagnostics'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  /**
   * Accepts a preset name (`'warn'`, `'throw'`, `'silent'`) or a full `Diagnostics`
   * instance for custom reporting/policy. The string form needs no import from
   * `@praxis-kit/diagnostics`.
   */
  readonly diagnostics?: Diagnostics | DiagnosticsMode
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
