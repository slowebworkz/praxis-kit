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

  it('warns for orphaned groups and groups owned by invalid roles', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'orphan', props: { role: 'group' } },
        { id: 'region', props: { role: 'region' } },
        { id: 'invalid-group', parentId: 'region', props: { role: 'group' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toEqual([
      ['missing-group-owner', 0],
      ['wrong-group-owner-role', 2],
    ])
  })

  it('accepts groups structurally contained by or explicitly owned by treeitems', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree' } },
        { id: 'parent', parentId: 'tree', props: { role: 'treeitem', 'aria-expanded': 'true', 'aria-owns': 'explicit-group' } },
        { id: 'nested-group', parentId: 'parent', props: { role: 'group' } },
        { id: 'child', parentId: 'nested-group', props: { role: 'treeitem' } },
        { id: 'explicit-group', props: { role: 'group' } },
      ]),
    ).toEqual([])
  })

  it('warns when a group has multiple owners', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree' } },
        { id: 'first', parentId: 'tree', props: { role: 'treeitem', 'aria-expanded': 'true', 'aria-owns': 'group' } },
        { id: 'second', parentId: 'tree', props: { role: 'treeitem', 'aria-expanded': 'true', 'aria-owns': 'group' } },
        { id: 'group', props: { role: 'group' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toContainEqual(['multiple-group-owners', 3])
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
  it('warns when one tree mixes aria-selected and aria-checked across treeitems', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree' } },
        { id: 'selected', parentId: 'tree', props: { role: 'treeitem', 'aria-selected': 'true' } },
        { id: 'checked', parentId: 'tree', props: { role: 'treeitem', 'aria-checked': 'false' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toEqual([['mixed-treeitem-selection-state', 0]])
  })

  it('accepts either treeitem selection mechanism when used consistently', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree' } },
        { id: 'first', parentId: 'tree', props: { role: 'treeitem', 'aria-selected': 'true' } },
        { id: 'second', parentId: 'tree', props: { role: 'treeitem', 'aria-selected': 'false' } },
      ]),
    ).toEqual([])
    expect(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree' } },
        { id: 'first', parentId: 'tree', props: { role: 'treeitem', 'aria-checked': 'true' } },
        { id: 'second', parentId: 'tree', props: { role: 'treeitem', 'aria-checked': 'false' } },
      ]),
    ).toEqual([])
  })

  it('keeps nested tree selection mechanisms independent', () => {
    expect(
      validateAriaTreeRelationships([
        { id: 'outer-tree', props: { role: 'tree' } },
        { id: 'outer-item', parentId: 'outer-tree', props: { role: 'treeitem', 'aria-selected': 'true' } },
        { id: 'inner-tree', parentId: 'outer-item', props: { role: 'tree' } },
        { id: 'inner-item', parentId: 'inner-tree', props: { role: 'treeitem', 'aria-checked': 'true' } },
      ]),
    ).toEqual([])
  })

})
