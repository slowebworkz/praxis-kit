// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { h, Fragment } from 'preact'
import { normalizeChildren } from './normalize-children'

describe('normalizeChildren (Preact adapter)', () => {
  it('returns [] for null / undefined', () => {
    expect(normalizeChildren(null)).toEqual([])
    expect(normalizeChildren(undefined)).toEqual([])
  })

  it('preserves a non-empty string child', () => {
    expect(normalizeChildren('Accept terms and conditions')).toEqual([
      'Accept terms and conditions',
    ])
  })

  it('drops a whitespace-only string child', () => {
    expect(normalizeChildren('   ')).toEqual([])
  })

  it('preserves a number child', () => {
    expect(normalizeChildren(42)).toEqual([42])
  })

  it('returns [element] for a single valid Preact element', () => {
    const el = h('span', null)
    const result = normalizeChildren(el)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(el)
  })

  it('keeps elements and non-empty text, dropping null / booleans / whitespace from a mixed array', () => {
    const el = h('span', null)
    expect(normalizeChildren([el, 'text', null, 42, false, '  '])).toEqual([el, 'text', 42])
  })

  it('returns [] for an empty array', () => {
    expect(normalizeChildren([])).toEqual([])
  })

  // Fragments are NOT traversed — a Fragment is one element, not flattened.
  it('treats a Fragment as a single element', () => {
    const fragment = h(Fragment, null, h('span', null))
    const result = normalizeChildren(fragment)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(fragment)
  })
})

// Preact's `ComponentChildren` can contain nested arrays and nested Fragments. This normalizer
// is deliberately ONE level deep (`children.filter(...)`, no recursion) — it is not a
// `Children.toArray`. These pin that boundary. Preact itself still renders nested structures
// correctly on the intrinsic path (`h(tag, { children })` is untouched); normalization only
// governs what the contract evaluators and the asChild/Slot single-child check see.
describe('normalizeChildren — nested structures are not traversed', () => {
  it('discards a nested array (`{[<A/>, [<B/>, <C/>]]}`) — arrays are not recursively flattened', () => {
    const a = h('a', null)
    const b = h('b', null)
    const c = h('i', null)
    // The inner `[b, c]` is neither an element nor text, so it is dropped; `a` survives.
    expect(normalizeChildren([a, [b, c]])).toEqual([a])
  })

  it('treats a nested Fragment as one opaque element — does not flatten its children', () => {
    const inner = h(Fragment, null, h('b', null), h('i', null))
    const outer = h(Fragment, null, h('a', null), inner)
    const result = normalizeChildren(outer)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(outer)
  })

  it('keeps a Fragment sibling as a single element (still not flattened)', () => {
    const a = h('a', null)
    const frag = h(Fragment, null, h('b', null), h('i', null))
    const result = normalizeChildren([a, frag])
    expect(result).toHaveLength(2)
    expect(result[1]).toBe(frag)
  })
})
