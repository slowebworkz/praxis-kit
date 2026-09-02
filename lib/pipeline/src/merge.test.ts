import { describe, expect, it } from 'vitest'
import { detectConflicts, mergeContext, mergeResults } from './merge'

interface Ctx {
  tag: string
  count: number
  meta: { a?: number; b?: number }
}

const base: Ctx = { tag: 'div', count: 0, meta: { a: 1 } }

describe('mergeContext', () => {
  it('replaces only the keys present on the patch', () => {
    const next = mergeContext(base, { count: 5 })
    expect(next).toEqual({ tag: 'div', count: 5, meta: { a: 1 } })
  })

  it('leaves absent keys untouched', () => {
    const next = mergeContext(base, { tag: 'span' })
    expect(next.count).toBe(0)
    expect(next.meta).toBe(base.meta)
  })

  it('replaces an object key wholesale — no deep merge', () => {
    const next = mergeContext(base, { meta: { b: 2 } })
    expect(next.meta).toEqual({ b: 2 })
  })

  it('treats an undefined patch as identity', () => {
    expect(mergeContext(base, undefined)).toBe(base)
  })

  it('treats an empty patch as a value-equal copy', () => {
    expect(mergeContext(base, {})).toEqual(base)
  })

  it('does not mutate the accumulated context', () => {
    mergeContext(base, { count: 9 })
    expect(base.count).toBe(0)
  })
})

describe('mergeResults', () => {
  it('folds patches in order — later pass wins on a shared key', () => {
    const out = mergeResults(base, [
      { context: { count: 1 } },
      { context: { tag: 'p' } },
      { context: { count: 3 } },
    ])
    expect(out).toEqual({ tag: 'p', count: 3, meta: { a: 1 } })
  })

  it('handles results with no context patch', () => {
    const out = mergeResults(base, [{}, { context: { count: 7 } }, {}])
    expect(out.count).toBe(7)
  })
})

describe('detectConflicts', () => {
  it('returns keys written by more than one patch', () => {
    expect(
      detectConflicts<Ctx>([{ count: 1 }, { tag: 'p' }, { count: 2 }]),
    ).toEqual(['count'])
  })

  it('returns an empty array for disjoint patches', () => {
    expect(detectConflicts<Ctx>([{ count: 1 }, { tag: 'p' }, undefined])).toEqual([])
  })

  it('reports each conflicting key once', () => {
    expect(
      detectConflicts<Ctx>([{ count: 1 }, { count: 2 }, { count: 3 }]),
    ).toEqual(['count'])
  })
})
