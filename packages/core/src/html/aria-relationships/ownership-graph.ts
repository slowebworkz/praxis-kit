import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { isResolvedLookup } from './id-reference-index'
import { hasRole } from './shared'
import type { AriaIdLookupIndex, AriaReferenceElement, AriaResolvedLookup } from './types'

type Edges = readonly ReadonlySet<number>[]

/** What a walk does after visiting an element. */
type Step = 'descend' | 'skip' | 'stop'

/**
 * Iterative depth-first walk over `edges` starting from the neighbours of `start`. Each
 * element is visited once, so cycles terminate. `visit` decides whether to keep walking
 * through the visited element (`descend`), not walk through it (`skip`), or end the walk
 * (`stop`).
 */
function walk(edges: Edges, start: number, visit: (index: number) => Step): void {
  const pending = [...edges[start]!]
  const visited = new Set<number>()
  while (pending.length > 0) {
    const current = pending.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    const step = visit(current)
    if (step === 'stop') return
    if (step === 'descend') pending.push(...edges[current]!)
  }
}

/** Containment (`parentId`) and explicit ownership (`aria-owns`) edges over an element scope. */
export interface OwnershipGraph {
  /** Direct owners of each element, by element index. */
  readonly parents: Edges
  /** Direct owned elements of each element, by element index. */
  readonly children: Edges
  indexOf(element: AriaReferenceElement): number | undefined
  /** Every element that contains or owns `index`, transitively. */
  ancestorsOf(index: number): Set<number>
  /** Every element contained or owned by `index`, transitively. */
  descendantsOf(index: number): Set<number>
  /**
   * The first owner matching `isOwner` on each upward branch. A matching owner is not walked
   * through, so an outer owner behind a nested one is not counted.
   */
  nearestOwnersOf(index: number, isOwner: (ownerIndex: number) => boolean): Set<number>
  /**
   * Whether `rootIndex` is an ancestor of `index` without walking through an element that
   * `isBoundary` reports (the root itself is still reached).
   */
  belongsTo(
    index: number,
    rootIndex: number,
    isBoundary: (ancestorIndex: number) => boolean,
  ): boolean
}

/**
 * Builds the ownership graph for `elements`. Every element contributes a `parentId` edge to its
 * resolved parent; elements for which `ownsViaAriaOwns` is true also contribute `aria-owns`
 * edges to the elements they resolve.
 */
export function buildOwnershipGraph(
  elements: readonly AriaReferenceElement[],
  index: AriaIdLookupIndex,
  ownsViaAriaOwns: (element: AriaReferenceElement) => boolean,
): OwnershipGraph {
  const indexes = new Map<AriaReferenceElement, number>()
  iterate.forEach(elements, (element, elementIndex) => {
    indexes.set(element, elementIndex)
  })

  const parents = elements.map(() => new Set<number>())
  const children = elements.map(() => new Set<number>())
  const addEdge = (parentIndex: number, childIndex: number) => {
    parents[childIndex]!.add(parentIndex)
    children[parentIndex]!.add(childIndex)
  }

  iterate.forEach(elements, (element, childIndex) => {
    if (isString(element.parentId)) {
      const parent = index.lookup(element.parentId)
      if (isResolvedLookup(parent)) {
        const parentIndex = indexes.get(parent.element)
        if (isDefined(parentIndex)) addEdge(parentIndex, childIndex)
      }
    }

    if (ownsViaAriaOwns(element)) {
      const owned = index.resolveList(element.props?.['aria-owns']).filter(isResolvedLookup)
      iterate.forEach(owned, (target) => {
        const targetIndex = indexes.get(target.element)
        if (isDefined(targetIndex)) addEdge(childIndex, targetIndex)
      })
    }
  })

  return {
    parents,
    children,
    indexOf: (element) => indexes.get(element),
    ancestorsOf(start) {
      const ancestors = new Set<number>()
      walk(parents, start, (current) => {
        ancestors.add(current)
        return 'descend'
      })
      return ancestors
    },
    descendantsOf(start) {
      const descendants = new Set<number>()
      walk(children, start, (current) => {
        descendants.add(current)
        return 'descend'
      })
      return descendants
    },
    nearestOwnersOf(start, isOwner) {
      const owners = new Set<number>()
      walk(parents, start, (current) => {
        if (!isOwner(current)) return 'descend'
        owners.add(current)
        return 'skip'
      })
      return owners
    },
    belongsTo(start, rootIndex, isBoundary) {
      let found = false
      walk(parents, start, (current) => {
        if (current === rootIndex) {
          found = true
          return 'stop'
        }
        return isBoundary(current) ? 'skip' : 'descend'
      })
      return found
    },
  }
}

/**
 * For an element's `aria-activedescendant`, returns the first token's lookup when it resolves
 * to an element that is not an owned descendant with one of `validTargetRoles`. Missing and
 * ambiguous tokens, and targets outside the scope, are not reported.
 */
export function misownedActiveDescendant(
  graph: OwnershipGraph,
  index: AriaIdLookupIndex,
  element: AriaReferenceElement,
  sourceIndex: number,
  validTargetRoles: ReadonlySet<string>,
): AriaResolvedLookup | undefined {
  const [active] = index.resolveList(element.props?.['aria-activedescendant'])
  if (!active || !isResolvedLookup(active)) return undefined

  const targetIndex = graph.indexOf(active.element)
  if (!isDefined(targetIndex)) return undefined

  const owned =
    hasRole(active.element, validTargetRoles) && graph.descendantsOf(sourceIndex).has(targetIndex)
  return owned ? undefined : active
}
