import { describe, expect, it } from 'vitest'
import {
  createAriaReferenceIndex,
  isResolvedLookup,
  isUnresolvedLookup,
} from './id-reference-index'

describe('internal ARIA ID lookup index', () => {
  it('resolves by top-level id and falls back to props.id', () => {
    const topLevel = { id: 'a' }
    const fromProps = { props: { id: 'b' } }
    const index = createAriaReferenceIndex([topLevel, fromProps])

    expect(index.lookup('a')).toEqual({ status: 'resolved', id: 'a', element: topLevel })
    expect(index.lookup('b')).toEqual({ status: 'resolved', id: 'b', element: fromProps })
  })

  it('prefers a string top-level id over props.id', () => {
    const element = { id: 'top', props: { id: 'inner' } }
    const index = createAriaReferenceIndex([element])

    expect(index.lookup('top')).toMatchObject({ status: 'resolved' })
    expect(index.lookup('inner')).toEqual({ status: 'missing', id: 'inner' })
  })

  it('ignores empty and non-string ids', () => {
    const index = createAriaReferenceIndex([{ id: '' }, { id: null }, { props: { id: 7 } }, {}])

    expect(index.lookup('')).toEqual({ status: 'missing', id: '' })
    expect(index.lookup('7')).toEqual({ status: 'missing', id: '7' })
  })

  it('reports duplicates as ambiguous and keeps every match in order', () => {
    const first = { id: 'dup' }
    const second = { props: { id: 'dup' } }
    const index = createAriaReferenceIndex([first, second])

    expect(index.lookup('dup')).toEqual({
      status: 'ambiguous',
      id: 'dup',
      matches: [first, second],
    })
  })

  it('splits IDREFS on any whitespace, including Unicode whitespace', () => {
    const index = createAriaReferenceIndex([{ id: 'a' }, { id: 'b' }, { id: 'c' }])

    expect(index.resolveList('a\tb\n c a').map(({ id }) => id)).toEqual(['a', 'b', 'c', 'a'])
  })

  it('returns an empty list for non-string, empty, and whitespace-only values', () => {
    const index = createAriaReferenceIndex([{ id: 'a' }])

    for (const value of [undefined, null, 7, '', '   ', ' ']) {
      expect(index.resolveList(value)).toEqual([])
    }
  })

  it('provides type guards that split resolved from unresolved lookups', () => {
    const index = createAriaReferenceIndex([{ id: 'a' }, { id: 'd' }, { id: 'd' }])
    const results = index.resolveList('a missing d')

    expect(results.filter(isResolvedLookup).map(({ id }) => id)).toEqual(['a'])
    expect(results.filter(isUnresolvedLookup).map(({ id, status }) => [id, status])).toEqual([
      ['missing', 'missing'],
      ['d', 'ambiguous'],
    ])
  })
})
