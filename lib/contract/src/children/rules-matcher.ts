import type { MatchMatrix, NormalizedChildRule } from '../types'

/** Reads child.type without assuming a framework — works for React elements and Vue vnodes. */
function getChildType(child: unknown): unknown | undefined {
  if (child === null || typeof child !== 'object' || !('type' in child)) return undefined
  return child.type
}

/**
 * Builds a type-dispatch index from rules when every rule declares a `type`.
 * Returns null if any rule omits `type` or if two rules share the same type
 * (ambiguous — the linear fallback handles that correctly).
 */
function buildTypeIndex(rules: NormalizedChildRule[]): Map<unknown, number> | null {
  const index = new Map<unknown, number>()
  for (let ri = 0; ri < rules.length; ri++) {
    const t = rules[ri]!.type
    if (t === undefined) return null
    if (index.has(t)) return null // duplicate type — can't do O(1) dispatch
    index.set(t, ri)
  }
  return index.size > 0 ? index : null
}

export class RuleMatcher {
  readonly #rules: NormalizedChildRule[]
  /** Non-null when every rule has a unique `type` — enables O(n) dispatch. */
  readonly #typeIndex: Map<unknown, number> | null

  constructor(rules: NormalizedChildRule[]) {
    this.#rules = rules
    this.#typeIndex = buildTypeIndex(rules)
  }

  match(children: unknown[]): MatchMatrix {
    // forward: child → rules it matched  (detects unexpected/ambiguous children)
    // reverse: rule  → children it matched (counts matches per rule for cardinality)
    const forward = new Map<number, Set<number>>()
    const reverse = new Map<number, Set<number>>()

    for (let ri = 0; ri < this.#rules.length; ri++) {
      reverse.set(ri, new Set())
    }

    if (this.#typeIndex !== null) {
      // O(n) fast path: one Map lookup per child instead of checking every rule.
      for (let ci = 0; ci < children.length; ci++) {
        const t = getChildType(children[ci])
        if (t === undefined) continue
        const ri = this.#typeIndex.get(t)
        if (ri === undefined) continue

        let childEntry = forward.get(ci)
        if (!childEntry) {
          childEntry = new Set()
          forward.set(ci, childEntry)
        }
        childEntry.add(ri)
        reverse.get(ri)!.add(ci)
      }
    } else {
      // O(n×m) linear fallback: used when rules lack type fields or share types.
      for (const [ci, child] of children.entries()) {
        for (const [ri, rule] of this.#rules.entries()) {
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
    }

    return { childToRules: { forward, reverse } }
  }
}
