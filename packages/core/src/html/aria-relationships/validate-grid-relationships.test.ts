import { describe, expect, it } from 'vitest'
import { validateAriaGridRelationships } from './validate-grid-relationships'

describe('ARIA grid relationships', () => {
  it('accepts a grid with a row and cells', () => {
    expect(validateAriaGridRelationships([
      { id: 'grid', props: { role: 'grid', 'aria-activedescendant': 'cell' } },
      { id: 'row', role: 'row', parentId: 'grid' },
      { id: 'cell', role: 'gridcell', parentId: 'row' },
      { id: 'header', role: 'columnheader', parentId: 'row' },
    ])).toEqual([])
  })

  it('supports explicit aria-owns relationships', () => {
    expect(validateAriaGridRelationships([
      { id: 'grid', props: { role: 'grid', 'aria-owns': 'row' } },
      { id: 'row', props: { role: 'row', 'aria-owns': 'cell' } },
      { id: 'cell', props: { role: 'gridcell' } },
    ])).toEqual([])
  })

  it('warns when rows and cells lack their required owners', () => {
    expect(validateAriaGridRelationships([
      { id: 'row', props: { role: 'row' } },
      { id: 'cell', props: { role: 'gridcell' } },
    ]).map(({ code }) => code)).toEqual(['row-without-grid-owner', 'cell-without-row-owner'])
  })

  it('warns when the active descendant is not a cell owned by the grid', () => {
    expect(validateAriaGridRelationships([
      { id: 'grid', props: { role: 'grid', 'aria-activedescendant': 'outside' } },
      { id: 'row', role: 'row', parentId: 'grid' },
      { id: 'cell', role: 'gridcell', parentId: 'row' },
      { id: 'outside', props: { role: 'button' } },
    ])).toMatchObject([{ code: 'active-descendant-not-owned', targetId: 'outside' }])
  })

  it('does not impose optional row/column counts or indices', () => {
    expect(validateAriaGridRelationships([
      { id: 'grid', props: { role: 'grid' } },
      { id: 'row', role: 'row', parentId: 'grid' },
      { id: 'cell', role: 'gridcell', parentId: 'row' },
    ])).toEqual([])
  })
})
