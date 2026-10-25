import { describe, expect, it } from 'vitest'
import { validateAriaTabRelationships } from './validate-tab-relationships'
import { validateAriaIdReferences } from './validate-id-references'
import { createAriaReferenceIndex } from './id-reference-index'

describe('ARIA reference index', () => {
  it('distinguishes resolved, missing, and ambiguous IDs', () => {
    const first = { id: 'tab-1', props: { role: 'tab' } }
    const index = createAriaReferenceIndex([first, { id: 'dup' }, { id: 'dup' }])
    expect(index.lookup('tab-1')).toMatchObject({ status: 'resolved', element: first })
    expect(index.lookup('missing')).toMatchObject({ status: 'missing' })
    expect(index.lookup('dup')).toMatchObject({ status: 'ambiguous' })
  })
})

describe('ARIA ID-reference validation', () => {
  it('reports missing and ambiguous targets deterministically', () => {
    const diagnostics = validateAriaIdReferences([
      { id: 'source', props: { 'aria-controls': 'missing dup' } },
      { id: 'dup' },
      { id: 'dup' },
    ])
    expect(diagnostics.map(({ code, targetId }) => [code, targetId])).toEqual([
      ['missing-target', 'missing'],
      ['ambiguous-target', 'dup'],
    ])
  })
})

describe('ARIA tab relationships', () => {
  it('accepts a tab controlling a tabpanel and the panel labelled by that tab', () => {
    expect(
      validateAriaTabRelationships([
        { id: 'tab-1', props: { role: 'tab', 'aria-controls': 'panel-1' } },
        { id: 'panel-1', props: { role: 'tabpanel', 'aria-labelledby': 'tab-1' } },
      ]),
    ).toEqual([])
  })

  it('warns when a tab controls an element with the wrong role', () => {
    expect(
      validateAriaTabRelationships([
        { id: 'tab-1', props: { role: 'tab', 'aria-controls': 'panel-1' } },
        { id: 'panel-1', props: { role: 'region' } },
      ]),
    ).toMatchObject([{ code: 'wrong-target-role', targetId: 'panel-1' }])
  })

  it('warns when a uniquely resolved panel label does not reference a tab', () => {
    expect(
      validateAriaTabRelationships([
        { id: 'heading', props: { role: 'heading' } },
        { id: 'panel-1', props: { role: 'tabpanel', 'aria-labelledby': 'heading' } },
      ]),
    ).toMatchObject([{ code: 'missing-tab-reference', targetId: 'heading' }])
  })

  it('does not guess when references are missing or ambiguous', () => {
    expect(
      validateAriaTabRelationships([
        { id: 'tab-1', props: { role: 'tab', 'aria-controls': 'panel' } },
        { id: 'panel', props: { role: 'region' } },
        { id: 'panel', props: { role: 'tabpanel' } },
      ]),
    ).toEqual([])
  })
})
