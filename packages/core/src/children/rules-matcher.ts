import type { ChildIndex, NormalizedChildRule, MatchMatrix, RuleIndex } from '../types'

export class RuleMatcher {
  match(children: unknown[], rules: NormalizedChildRule[]): MatchMatrix {
    const forward = new Map<ChildIndex, Set<RuleIndex>>()
    const reverse = new Map<RuleIndex, Set<ChildIndex>>()

    for (const [ri, rule] of rules.entries()) {
      for (const [i, child] of children.entries()) {
        if (!rule.match(child)) continue

        const ci = i as ChildIndex
        const ri_ = ri as RuleIndex

        const childEntry = forward.get(ci) ?? new Set<RuleIndex>()
        childEntry.add(ri_)
        forward.set(ci, childEntry)

        const ruleEntry = reverse.get(ri_) ?? new Set<ChildIndex>()
        ruleEntry.add(ci)
        reverse.set(ri_, ruleEntry)
      }
    }

    return { childToRules: { forward, reverse } }
  }
}
