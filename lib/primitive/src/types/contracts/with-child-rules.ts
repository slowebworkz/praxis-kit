import type { ChildRuleInput } from './child-rule-input'

/** The **minimal structural bound** for "a component-options object that may
 *  carry child rules". Used as the upper bound on generic parameters
 *  (`TOptions extends WithChildRules`) and as the wildcard in inference
 *  positions (`BuiltRuntime<infer G, WithChildRules>`), so it stays as loose as
 *  possible on purpose — everything downstream must be assignable to it.
 *
 *  It is **not** the type that decides whether children enforcement is active.
 *  That narrowing is done downstream (adapter-utils' `WithChildrenEnforcement`
 *  checks for a *non-empty* `children` array); `WithChildRules` only says the
 *  slot exists and, now, that its element shape is `ChildRuleInput` rather than
 *  `unknown`. */
export type WithChildRules = {
  enforcement?: {
    children?: readonly ChildRuleInput[]
  }
}
