import type { ChildIndex, MatchMatrix, NormalizedChildRule, RuleIndex } from '../types'

export class RuleMatcher {
  match(children: unknown[], rules: NormalizedChildRule[]): MatchMatrix {
    // forward: child → rules it matched  (detects unexpected/ambiguous children)
    // reverse: rule  → children it matched (counts matches per rule for cardinality)
    const forward = new Map<ChildIndex, Set<RuleIndex>>()
    const reverse = new Map<RuleIndex, Set<ChildIndex>>()

    for (const [ri, rule] of rules.entries()) {
      for (const [i, child] of children.entries()) {
        if (!rule.match(child)) continue

        const ci = i as ChildIndex
        const ri_ = ri as RuleIndex

        let childEntry = forward.get(ci)
        if (!childEntry) {
          childEntry = new Set()
          forward.set(ci, childEntry)
        }
        childEntry.add(ri_)

        let ruleEntry = reverse.get(ri_)
        if (!ruleEntry) {
          ruleEntry = new Set()
          reverse.set(ri_, ruleEntry)
        }
        ruleEntry.add(ci)
      }
    }

    return { childToRules: { forward, reverse } }
  }
}
