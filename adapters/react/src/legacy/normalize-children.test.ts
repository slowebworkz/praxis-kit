import { describe, it, expect } from 'vitest'
import { createElement, Fragment } from 'react'
import { normalizeChildren } from './normalize-children'

describe('normalizeChildren (legacy / React 18)', () => {
  it('returns [] for null', () => {
    expect(normalizeChildren(null)).toEqual([])
  })

  it('returns [] for undefined', () => {
    expect(normalizeChildren(undefined)).toEqual([])
  })

  it('returns [] for a string', () => {
    expect(normalizeChildren('text')).toEqual([])
  })

  it('returns [element] for a single valid React element', () => {
    const el = createElement('span')
    const result = normalizeChildren(el)
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('span')
  })

  it('returns elements from a flat array', () => {
    const a = createElement('span')
    const b = createElement('div')
    const result = normalizeChildren([a, b])
    expect(result).toHaveLength(2)
    expect(result[0]!.type).toBe('span')
    expect(result[1]!.type).toBe('div')
  })

  it('filters non-elements from a mixed array', () => {
    const el = createElement('span')
    const result = normalizeChildren([el, 'text', null, 42])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('span')
  })

  it('returns [] for an empty array', () => {
    expect(normalizeChildren([])).toEqual([])
  })

  // Note: Children.toArray traversed Fragment boundaries in React 18, flattening
  // their children. In React 19 this behavior was removed — Fragments are returned
  // as opaque elements, identical to the current/ implementation.
  it('does NOT flatten Fragment children in React 19 (same as current/)', () => {
    const inner = createElement('span')
    const fragment = createElement(Fragment, null, inner)
    const result = normalizeChildren(fragment)
    // React 19: Children.toArray no longer traverses Fragments
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe(Fragment)
  })

  it('treats a Fragment with multiple children as one element in React 19', () => {
    const a = createElement('span')
    const b = createElement('div')
    const fragment = createElement(Fragment, null, a, b)
    const result = normalizeChildren(fragment)
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe(Fragment)
  })
})
