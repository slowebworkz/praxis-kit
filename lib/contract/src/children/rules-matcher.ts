import type { MatchMatrix, NormalizedChildRule } from '../types'
import { isObject } from '@praxis-ui/primitive'

/** Reads child.type without assuming a framework — works for React elements and Vue vnodes. */
function getChildType(child: unknown): unknown | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  return child.type
}

type PartialIndex = {
  /** type → rule index, for rules with a unique type field. */
  typeIndex: Map<unknown, number>
  /** Rule indices that lack a type field, or share a type with another rule.
   *  These require a linear match() call per child. */
  untypedIndices: readonly number[]
}

/**
 * Separates rules into an O(1) type-dispatch index and a linear-scan remainder.
 *
 * Rules without a type field go straight to untypedIndices.
 * Rules whose type is shared with another rule are removed from the index and
 * demoted to untypedIndices — the linear path handles ambiguous multi-matches
 * correctly, the index cannot.
 */
function buildPartialIndex(rules: NormalizedChildRule[]): PartialIndex {
  const typeIndex = new Map<unknown, number>()
  const duplicateTypes = new Set<unknown>()
  const untypedIndices: number[] = []

  for (let ri = 0; ri < rules.length; ri++) {
    const t = rules[ri]!.type
    if (t === undefined) {
      untypedIndices.push(ri)
    } else if (typeIndex.has(t)) {
      duplicateTypes.add(t)
    } else {
      typeIndex.set(t, ri)
    }
  }

  // Demote duplicate-type rules: remove from index, add to linear path.
  if (duplicateTypes.size > 0) {
    for (const t of duplicateTypes) typeIndex.delete(t)
    for (let ri = 0; ri < rules.length; ri++) {
      if (duplicateTypes.has(rules[ri]!.type)) untypedIndices.push(ri)
    }
  }

  return { typeIndex, untypedIndices }
}

export type MatchResult = {
  matrix: MatchMatrix
  /** Child indices with no rule match — detected inline during the match pass. */
  unexpectedIndices: ReadonlySet<number>
  /** Child indices that matched more than one rule — detected inline. */
  ambiguousIndices: ReadonlySet<number>
}

export class RuleMatcher {
  readonly #rules: NormalizedChildRule[]
  readonly #typeIndex: Map<unknown, number>
  readonly #untypedIndices: readonly number[]

  constructor(rules: NormalizedChildRule[]) {
    this.#rules = rules
    const { typeIndex, untypedIndices } = buildPartialIndex(rules)
    this.#typeIndex = typeIndex
    this.#untypedIndices = untypedIndices
  }

  match(children: unknown[]): MatchResult {
    // forward: child → rules it matched  (detects unexpected/ambiguous children)
    // reverse: rule  → children it matched (counts matches per rule for cardinality)
    const forward = new Map<number, Set<number>>()
    const reverse = new Map<number, Set<number>>()
    const unexpectedIndices = new Set<number>()
    const ambiguousIndices = new Set<number>()

    for (let ri = 0; ri < this.#rules.length; ri++) {
      reverse.set(ri, new Set())
    }

    for (const [ci, child] of children.entries()) {
      // Phase 1 — O(1): type dispatch for indexed rules.
      const t = getChildType(child)
      if (t !== undefined) {
        const ri = this.#typeIndex.get(t)
        if (ri !== undefined) {
          let childEntry = forward.get(ci)
          if (!childEntry) {
            childEntry = new Set()
            forward.set(ci, childEntry)
          }
          childEntry.add(ri)
          reverse.get(ri)!.add(ci)
        }
      }

      // Phase 2 — O(m_untyped): linear scan for predicate-only and demoted rules.
      for (const ri of this.#untypedIndices) {
        if (!this.#rules[ri]!.match(child)) continue
        let childEntry = forward.get(ci)
        if (!childEntry) {
          childEntry = new Set()
          forward.set(ci, childEntry)
        }
        childEntry.add(ri)
        reverse.get(ri)!.add(ci)
      }

      // Classify inline — eliminates the need for a second children traversal.
      const entry = forward.get(ci)
      if (!entry) {
        unexpectedIndices.add(ci)
      } else if (entry.size > 1) {
        ambiguousIndices.add(ci)
      }
    }

    return { matrix: { childToRules: { forward, reverse } }, unexpectedIndices, ambiguousIndices }
  }
}
