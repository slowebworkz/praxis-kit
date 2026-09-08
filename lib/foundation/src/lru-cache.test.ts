import { describe, expect, it } from 'vitest'

import { LRUCache } from './lru-cache'

describe('LRUCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new LRUCache<string, number>(2)
    expect(cache.get('a')).toBeUndefined()
  })

  it('returns a stored value', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('has() reflects presence without affecting recency', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.has('a')).toBe(true)
    cache.set('c', 3)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
  })

  it('updating an existing key replaces its value', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('a', 2)
    expect(cache.get('a')).toBe(2)
    expect(cache.size).toBe(1)
  })

  it('updating an existing key promotes it to MRU', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 3) // 'a' is now MRU; 'b' is now LRU
    cache.set('c', 4) // evicts 'b', not 'a'
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('evicts the least recently used entry once maxSize is exceeded', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.has('a')).toBe(false)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.size).toBe(2)
  })

  it('a get() promotes the key to most-recently-used, sparing it from eviction', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // 'a' is now MRU; 'b' is now LRU
    cache.set('c', 3) // evicts 'b', not 'a'
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('maintains LRU ordering across mixed get/set operations', () => {
    const cache = new LRUCache<number, number>(3)
    cache.set(1, 1)
    cache.set(2, 2)
    cache.set(3, 3)
    cache.get(1)
    cache.get(2)
    cache.set(4, 4) // evicts 3, the only key untouched since insertion
    expect(cache.has(1)).toBe(true)
    expect(cache.has(2)).toBe(true)
    expect(cache.has(3)).toBe(false)
    expect(cache.has(4)).toBe(true)
  })

  it('clear() empties the cache', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('never exceeds maxSize across many insertions', () => {
    const cache = new LRUCache<number, number>(3)
    for (let i = 0; i < 100; i++) cache.set(i, i)
    expect(cache.size).toBe(3)
    expect(cache.has(99)).toBe(true)
    expect(cache.has(0)).toBe(false)
  })

  it('treats a stored undefined as a hit, not a miss', () => {
    const cache = new LRUCache<string, number | undefined>(2)
    cache.set('a', undefined)
    expect(cache.has('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
  })

  it('delete() removes a key and reports whether it existed', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.has('a')).toBe(false)
    expect(cache.delete('a')).toBe(false)
  })

  it.each([0, -1, 1.5, NaN, Infinity])(
    'throws a RangeError for an invalid maxSize (%s)',
    (maxSize) => {
      expect(() => new LRUCache(maxSize)).toThrow(RangeError)
    },
  )

  it('accepts a maxSize of 1', () => {
    const cache = new LRUCache<string, number>(1)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.has('a')).toBe(false)
    expect(cache.get('b')).toBe(2)
  })
})
