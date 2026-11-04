import { describe, expect, it } from 'vitest'
import { createAriaReferenceIndex } from './id-reference-index'
import { buildOwnershipGraph, misownedActiveDescendant } from './ownership-graph'
import { GRID_CELL_ROLES, MENU_OWNER_ROLES, hasRole, roleOf } from './shared'
import type { AriaReferenceElement } from './types'

const build = (
  elements: readonly AriaReferenceElement[],
  ownsViaAriaOwns: (element: AriaReferenceElement) => boolean = () => true,
) => {
  const index = createAriaReferenceIndex(elements)
  return { index, graph: buildOwnershipGraph(elements, index, ownsViaAriaOwns) }
}

const sorted = (values: Iterable<number>) => [...values].sort()

describe('ownership graph', () => {
  it('links elements through parentId and aria-owns', () => {
    const { graph } = build([
      { id: 'root', props: { 'aria-owns': 'owned' } },
      { id: 'child', parentId: 'root' },
      { id: 'owned' },
    ])

    expect(sorted(graph.children[0]!)).toEqual([1, 2])
    expect(sorted(graph.parents[1]!)).toEqual([0])
    expect(sorted(graph.parents[2]!)).toEqual([0])
  })

  it('only follows aria-owns for elements the predicate allows', () => {
    const { graph } = build(
      [{ id: 'root', props: { 'aria-owns': 'owned' } }, { id: 'owned' }],
      (element) => roleOf(element) === 'allowed',
    )

    expect(sorted(graph.children[0]!)).toEqual([])
  })

  it('walks ancestors and descendants transitively and terminates on cycles', () => {
    const { graph } = build([
      { id: 'a', parentId: 'c' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ])

    expect(sorted(graph.ancestorsOf(0))).toEqual([0, 1, 2])
    expect(sorted(graph.descendantsOf(0))).toEqual([0, 1, 2])
  })

  it('stops at the nearest matching owner on each branch', () => {
    const elements: AriaReferenceElement[] = [
      { id: 'outer', props: { role: 'menubar' } },
      { id: 'inner', parentId: 'outer', props: { role: 'menu' } },
      { id: 'item', parentId: 'inner', props: { role: 'menuitem' } },
    ]
    const { graph } = build(elements)

    expect(
      sorted(graph.nearestOwnersOf(2, (index) => hasRole(elements[index]!, MENU_OWNER_ROLES))),
    ).toEqual([1])
  })

  it('attributes an element to a root without walking through a boundary', () => {
    const { graph } = build([
      { id: 'outer' },
      { id: 'nested', parentId: 'outer' },
      { id: 'item', parentId: 'nested' },
    ])

    expect(graph.belongsTo(2, 0, () => false)).toBe(true)
    expect(graph.belongsTo(2, 0, (index) => index === 1)).toBe(false)
    expect(graph.belongsTo(2, 1, (index) => index === 1)).toBe(true)
  })
})

describe('misownedActiveDescendant', () => {
  const scope = (activeDescendant: string) =>
    build([
      { id: 'grid', props: { role: 'grid', 'aria-activedescendant': activeDescendant } },
      { id: 'cell', parentId: 'grid', props: { role: 'gridcell' } },
      { id: 'label', parentId: 'grid', props: { role: 'row' } },
      { id: 'elsewhere', props: { role: 'gridcell' } },
    ])
  const check = (activeDescendant: string) => {
    const { index, graph } = scope(activeDescendant)
    return misownedActiveDescendant(
      graph,
      index,
      { props: { 'aria-activedescendant': activeDescendant } },
      0,
      GRID_CELL_ROLES,
    )?.id
  }

  it('accepts an owned descendant with a valid role', () => {
    expect(check('cell')).toBeUndefined()
  })

  it('reports an owned descendant with the wrong role and an unowned one', () => {
    expect(check('label')).toBe('label')
    expect(check('elsewhere')).toBe('elsewhere')
  })

  it('ignores unresolved targets and later tokens', () => {
    expect(check('gone')).toBeUndefined()
    expect(check('cell elsewhere')).toBeUndefined()
  })
})
