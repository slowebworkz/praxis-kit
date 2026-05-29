import type { MatchMatrix, NormalizedChildRule } from '../types'

export class RuleMatcher {
  match(children: unknown[], rules: NormalizedChildRule[]): MatchMatrix {
    // forward: child → rules it matched  (detects unexpected/ambiguous children)
    // reverse: rule  → children it matched (counts matches per rule for cardinality)
    const forward = new Map<number, Set<number>>()
    const reverse = new Map<number, Set<number>>()

    // Pre-initialize one Set per rule so reverse.get(ri) is always defined —
    // rules with zero matches produce an empty Set, not undefined.
    for (let ri = 0; ri < rules.length; ri++) {
      reverse.set(ri, new Set())
    }

    // Single pass over children: assign each child to its matching rule buckets.
    for (const [ci, child] of children.entries()) {
      for (const [ri, rule] of rules.entries()) {
        if (!rule.match(child)) continue

        let childEntry = forward.get(ci)
        if (!childEntry) {
          childEntry = new Set()
          forward.set(ci, childEntry)
        }
        childEntry.add(ri)

        reverse.get(ri)!.add(ci)
      }
    }

    return { childToRules: { forward, reverse } }
  }
}
