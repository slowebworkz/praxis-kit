import { describe, expect, it } from 'vitest'
import { validateAriaListboxRelationships } from '../aria-listbox-relationship-validation'
import { validateAriaGridRelationships } from './validate-grid-relationships'
import { validateAriaMenuRelationships } from './validate-menu-relationships'
import { validateAriaRadiogroupRelationships } from './validate-radiogroup-relationships'
import { validateAriaTreeRelationships } from './validate-tree-relationships'

const summary = (diagnostics: readonly { code: string; sourceIndex: number }[]) =>
  diagnostics.map(({ code, sourceIndex }) => [code, sourceIndex])

describe('ownership graph: parent cycles terminate', () => {
  it('menu', () => {
    expect(
      summary(
        validateAriaMenuRelationships([
          { id: 'a', parentId: 'b', props: { role: 'menuitem' } },
          { id: 'b', parentId: 'a', props: { role: 'group' } },
        ]),
      ),
    ).toEqual([['menuitem-without-menu-owner', 0]])
  })

  it('radiogroup', () => {
    expect(
      summary(
        validateAriaRadiogroupRelationships([
          { id: 'a', parentId: 'b', props: { role: 'radio' } },
          { id: 'b', parentId: 'a', props: { role: 'group' } },
        ]),
      ),
    ).toEqual([['radio-without-radiogroup-owner', 0]])
  })

  it('grid', () => {
    expect(
      summary(
        validateAriaGridRelationships([
          { id: 'a', parentId: 'b', props: { role: 'row' } },
          { id: 'b', parentId: 'a', props: { role: 'rowgroup' } },
        ]),
      ),
    ).toEqual([
      ['row-without-grid-owner', 0],
      ['rowgroup-without-grid-owner', 1],
    ])
  })

  it('tree', () => {
    expect(
      summary(
        validateAriaTreeRelationships([
          { id: 'a', parentId: 'b', props: { role: 'treeitem' } },
          { id: 'b', parentId: 'a', props: { role: 'treeitem' } },
        ]),
      ),
    ).toEqual([
      ['missing-expanded', 0],
      ['missing-expanded', 1],
    ])
  })
})

describe('tree aria-activedescendant resolution', () => {
  const tree = (activeDescendant: string, extra: object[] = []) =>
    summary(
      validateAriaTreeRelationships([
        { id: 'tree', props: { role: 'tree', 'aria-activedescendant': activeDescendant } },
        { id: 'owned', parentId: 'tree', props: { role: 'treeitem' } },
        { id: 'other-tree', props: { role: 'tree' } },
        { id: 'outside', parentId: 'other-tree', props: { role: 'treeitem' } },
        ...extra,
      ]),
    )

  it('uses only the first token', () => {
    expect(tree('owned outside')).toEqual([])
    expect(tree('outside owned')).toEqual([['active-descendant-not-owned', 0]])
  })

  it('silently ignores missing and ambiguous targets', () => {
    expect(tree('gone')).toEqual([])
    expect(tree('dup', [{ id: 'dup' }, { id: 'dup' }])).toEqual([])
  })
})

describe('grid aria-activedescendant resolution', () => {
  const grid = (activeDescendant: string, extra: object[] = []) =>
    summary(
      validateAriaGridRelationships([
        { id: 'grid', props: { role: 'grid', 'aria-activedescendant': activeDescendant } },
        { id: 'row', parentId: 'grid', props: { role: 'row' } },
        { id: 'owned', parentId: 'row', props: { role: 'gridcell' } },
        { id: 'other-grid', props: { role: 'grid' } },
        { id: 'other-row', parentId: 'other-grid', props: { role: 'row' } },
        { id: 'outside', parentId: 'other-row', props: { role: 'gridcell' } },
        ...extra,
      ]),
    )

  it('uses only the first token', () => {
    expect(grid('owned outside')).toEqual([])
    expect(grid('outside owned')).toEqual([['active-descendant-not-owned', 0]])
  })

  it('silently ignores missing and ambiguous targets', () => {
    expect(grid('gone')).toEqual([])
    expect(grid('dup', [{ id: 'dup' }, { id: 'dup' }])).toEqual([])
  })
})

describe('listbox role source', () => {
  it('reads a top-level role like the other relationship validators', () => {
    const topLevelRoleOnly = { id: 'option-a', role: 'option' }

    expect(validateAriaListboxRelationships([topLevelRoleOnly])).toEqual([
      { elementIndex: 0, issue: 'option-without-listbox-owner' },
    ])
  })

  it('still reads the role from props, with the top-level role taking precedence', () => {
    expect(
      validateAriaListboxRelationships([{ id: 'option-a', props: { role: 'option' } }]),
    ).toEqual([{ elementIndex: 0, issue: 'option-without-listbox-owner' }])
    expect(
      validateAriaListboxRelationships([
        { id: 'option-a', role: 'presentation', props: { role: 'option' } },
      ]),
    ).toEqual([])
  })
})
