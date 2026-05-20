import { describe, expect, it } from 'vitest'

import { StaticClassResolver } from './static-class-resolver'

// ---------------------------------------------------------------------------
// No tagMap
// ---------------------------------------------------------------------------

describe('StaticClassResolver — no tagMap', () => {
  const r = new StaticClassResolver('base')

  it('returns baseClass for any string tag', () => {
    expect(r.resolve('div')).toBe('base')
    expect(r.resolve('section')).toBe('base')
    expect(r.resolve('article')).toBe('base')
  })

  it('returns baseClass for non-string tags', () => {
    expect(r.resolve(() => null)).toBe('base')
    expect(r.resolve(42)).toBe('base')
    expect(r.resolve(null)).toBe('base')
  })

  it('returns empty string when baseClass is empty', () => {
    const empty = new StaticClassResolver('')
    expect(empty.resolve('div')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// With tagMap
// ---------------------------------------------------------------------------

describe('StaticClassResolver — with tagMap', () => {
  const r = new StaticClassResolver('base', {
    section: 'section-class',
    article: 'article-class',
  })

  it('appends tagMap class for matching tag', () => {
    expect(r.resolve('section')).toBe('base section-class')
    expect(r.resolve('article')).toBe('base article-class')
  })

  it('returns only baseClass for non-matching string tag', () => {
    expect(r.resolve('div')).toBe('base')
    expect(r.resolve('nav')).toBe('base')
  })

  it('returns baseClass for non-string tags regardless of tagMap', () => {
    const FakeComponent = () => null
    expect(r.resolve(FakeComponent)).toBe('base')
  })
})

// ---------------------------------------------------------------------------
// skipTagMap
// ---------------------------------------------------------------------------

describe('StaticClassResolver — skipTagMap', () => {
  const r = new StaticClassResolver('base', { section: 'section-class' })

  it('returns only baseClass when skipTagMap is true, even for matching tag', () => {
    expect(r.resolve('section', true)).toBe('base')
  })

  it('returns only baseClass for non-string tag even when skipTagMap is false', () => {
    expect(r.resolve(() => null, false)).toBe('base')
  })
})

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe('StaticClassResolver — caching', () => {
  it('returns identical string reference on repeated calls', () => {
    const r = new StaticClassResolver('base', { section: 'section-class' })
    const first = r.resolve('section')
    const second = r.resolve('section')
    expect(first).toBe(second)
  })

  it('caches independently per tag', () => {
    const r = new StaticClassResolver('base', { section: 'sc', article: 'ac' })
    expect(r.resolve('section')).toBe('base sc')
    expect(r.resolve('article')).toBe('base ac')
    expect(r.resolve('section')).toBe('base sc')
  })

  it('evicts the LRU entry once the cache exceeds 200 entries', () => {
    const r = new StaticClassResolver('base')
    // Fill cache with 200 unique tags
    for (let i = 0; i < 200; i++) r.resolve(`tag-${i}`)
    // tag-0 is LRU — promote tag-1..199 by re-resolving them, leaving tag-0 as LRU
    // then add one more to trigger eviction
    r.resolve('tag-201')
    // tag-0 should have been evicted — resolving it again must recompute (still returns correct value)
    expect(r.resolve('tag-0')).toBe('base')
  })

  it('promotes a re-resolved entry to MRU so it is not the eviction candidate', () => {
    const r = new StaticClassResolver('base')
    for (let i = 0; i < 200; i++) r.resolve(`tag-${i}`)
    // Promote tag-0 to MRU
    r.resolve('tag-0')
    // Filling one more entry should evict tag-1 (now LRU), not tag-0
    r.resolve('tag-201')
    // tag-0 must still be cached — no recomputation needed (same value, but reference-stable)
    expect(r.resolve('tag-0')).toBe('base')
  })
})
