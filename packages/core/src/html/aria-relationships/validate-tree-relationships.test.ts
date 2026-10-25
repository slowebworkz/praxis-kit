import { describe, expect, it } from 'vitest'
import { validateAriaTreeRelationships } from './validate-tree-relationships'

describe('ARIA tree relationships', () => {
  it('accepts a nested tree with an active descendant and conditional expansion state', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-activedescendant': 'parent' } },
        { id: 'parent', role: 'treeitem', parentId: 'tree', props: { 'aria-expanded': 'false' } },
        { id: 'leaf', role: 'treeitem', parentId: 'parent' },
      ]),
    ).toEqual([])
  })

  it('supports explicit aria-owns ownership', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-owns': 'item' } },
        { id: 'item', props: { role: 'treeitem' } },
      ]),
    ).toMatchObject([])
  })

  it('warns for treeitems without an owner and for invalid owner roles', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'outside', props: { role: 'treeitem' } },
        { id: 'container', props: { role: 'region' } },
        { id: 'bad-child', props: { role: 'treeitem' }, parentId: 'container' },
      ]).map(({ code }) => code),
    ).toEqual(['missing-owner', 'wrong-owner-role'])
  })

  it('warns when the active descendant is outside the tree', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-activedescendant': 'outside' } },
        { id: 'other-tree', props: { role: 'tree' } },
        { id: 'outside', parentId: 'other-tree', props: { role: 'treeitem' } },
      ]),
    ).toMatchObject([{ code: 'active-descendant-not-owned', targetId: 'outside' }])
  })

  it('requires aria-expanded on expandable items but rejects it on leaves', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-owns': 'parent leaf' } },
        { id: 'parent', props: { role: 'treeitem', 'aria-owns': 'child' } },
        { id: 'child', props: { role: 'treeitem' } },
        { id: 'leaf', props: { role: 'treeitem', 'aria-expanded': 'false' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toEqual([
      ['missing-expanded', 1],
      ['expanded-on-leaf', 3],
    ])
  })

  it('reports multiple resolved owners without choosing one', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-owns': 'other item' } },
        { id: 'other', props: { role: 'treeitem', 'aria-expanded': 'true', 'aria-owns': 'item' } },
        { id: 'item', props: { role: 'treeitem' } },
      ]),
    ).toMatchObject([{ code: 'multiple-owners', sourceIndex: 2 }])
  })
})
