import { describe, expect, it } from 'vitest'

import { createAriaReferenceIndex } from './aria-reference-index'

describe('createAriaReferenceIndex', () => {
  it('resolves a unique ID to the original element identity', () => {
    const target = { id: 'panel', role: 'tabpanel' }
    const index = createAriaReferenceIndex([{ id: 'tab' }, target])

    expect(index.resolve('panel')).toEqual({ status: 'resolved', id: 'panel', target })
  })

  it('reports a missing target without throwing', () => {
    const index = createAriaReferenceIndex([{ id: 'known' }])

    expect(index.resolve('missing')).toEqual({ status: 'missing', id: 'missing' })
  })

  it('reports duplicate IDs as ambiguous rather than choosing one target', () => {
    const first = { id: 'duplicate', marker: 1 }
    const second = { id: 'duplicate', marker: 2 }
    const index = createAriaReferenceIndex([first, second])

    expect(index.resolve('duplicate')).toEqual({
      status: 'ambiguous',
      id: 'duplicate',
      targets: [first, second],
    })
  })

  it('resolves whitespace-separated IDREFS tokens in their original order', () => {
    const tab = { id: 'tab' }
    const panel = { id: 'panel' }
    const index = createAriaReferenceIndex([tab, panel])

    expect(index.resolveList('  tab\tpanel\nmissing  ')).toEqual([
      { status: 'resolved', id: 'tab', target: tab },
      { status: 'resolved', id: 'panel', target: panel },
      { status: 'missing', id: 'missing' },
    ])
  })

  it.each(['', ' \t\n\f\r '])(
    'returns an empty result for an empty IDREFS value (%j)',
    (value) => {
      expect(createAriaReferenceIndex([]).resolveList(value)).toEqual([])
    },
  )

  it('returns an empty result for a missing IDREFS value', () => {
    expect(createAriaReferenceIndex([]).resolveList(undefined)).toEqual([])
    expect(createAriaReferenceIndex([]).resolveList(null)).toEqual([])
  })

  it('ignores absent and empty IDs while matching non-empty IDs exactly', () => {
    const target = { id: ' target ' }
    const index = createAriaReferenceIndex([{ id: '' }, {}, target])

    expect(index.resolve('')).toEqual({ status: 'missing', id: '' })
    expect(index.resolve(' target ')).toEqual({ status: 'resolved', id: ' target ', target })
    expect(index.resolve('target')).toEqual({ status: 'missing', id: 'target' })
  })
})
