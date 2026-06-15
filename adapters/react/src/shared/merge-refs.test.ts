import { describe, it, expect, vi } from 'vitest'
import { mergeRefs } from './merge-refs'

describe('mergeRefs', () => {
  it('returns null when called with no args', () => {
    expect(mergeRefs()).toBeNull()
  })

  it('returns null when all refs are null or undefined', () => {
    expect(mergeRefs(null, undefined, null)).toBeNull()
  })

  it('returns the ref unchanged when exactly one is active', () => {
    const ref = vi.fn()
    expect(mergeRefs(null, ref, undefined)).toBe(ref)
  })

  it('passes the value through to a callback ref', () => {
    const ref = vi.fn()
    const merged = mergeRefs(ref)
    expect(merged).toBe(ref)
  })

  it('returns a merged callback that calls all callback refs', () => {
    const a = vi.fn()
    const b = vi.fn()
    const merged = mergeRefs(a, b)
    expect(typeof merged).toBe('function')
    ;(merged as (v: unknown) => void)('value')
    expect(a).toHaveBeenCalledWith('value')
    expect(b).toHaveBeenCalledWith('value')
  })

  it('sets .current on object refs', () => {
    const a = { current: null as unknown }
    const b = { current: null as unknown }
    const merged = mergeRefs(a, b)
    ;(merged as (v: unknown) => void)('value')
    expect(a.current).toBe('value')
    expect(b.current).toBe('value')
  })

  it('handles mixed callback and object refs', () => {
    const cb = vi.fn()
    const obj = { current: null as unknown }
    const merged = mergeRefs(cb, obj)
    ;(merged as (v: unknown) => void)(42)
    expect(cb).toHaveBeenCalledWith(42)
    expect(obj.current).toBe(42)
  })

  it('passes null when unmounted (value is null)', () => {
    const cb = vi.fn()
    const obj = { current: 'old' as unknown }
    const merged = mergeRefs(cb, obj)
    ;(merged as (v: unknown) => void)(null)
    expect(cb).toHaveBeenCalledWith(null)
    expect(obj.current).toBeNull()
  })

  it('skips null/undefined refs in multi-ref merge', () => {
    const a = vi.fn()
    const b = vi.fn()
    const merged = mergeRefs(null, a, undefined, b)
    ;(merged as (v: unknown) => void)('x')
    expect(a).toHaveBeenCalledWith('x')
    expect(b).toHaveBeenCalledWith('x')
  })
})
