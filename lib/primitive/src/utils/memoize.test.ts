import { describe, expect, it, vi } from 'vitest'

import { memoize } from './memoize'

describe('memoize()', () => {
  it('returns the wrapped function result', () => {
    const double = memoize((n: number) => n * 2)
    expect(double(3)).toBe(6)
  })

  it('calls the underlying function only once per distinct argument', () => {
    const fn = vi.fn((n: number) => n * 2)
    const double = memoize(fn)
    double(3)
    double(3)
    double(3)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('computes independently for each distinct argument', () => {
    const fn = vi.fn((n: number) => n * 2)
    const double = memoize(fn)
    expect(double(3)).toBe(6)
    expect(double(4)).toBe(8)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('uses SameValueZero key equality (works with string args)', () => {
    const fn = vi.fn((s: string) => s.toUpperCase())
    const upper = memoize(fn)
    upper('a')
    upper('a')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('treats distinct object references as distinct keys', () => {
    const fn = vi.fn((o: { n: number }) => o.n * 2)
    const double = memoize(fn)
    double({ n: 1 })
    double({ n: 1 })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('calls the underlying function only once even when it returns undefined', () => {
    const fn = vi.fn((): number | undefined => undefined)
    const cached = memoize(fn)
    expect(cached(1)).toBeUndefined()
    expect(cached(1)).toBeUndefined()
    expect(cached(1)).toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the cached result for the same object reference', () => {
    const fn = vi.fn((o: { n: number }) => o.n * 2)
    const double = memoize(fn)

    const obj = { n: 1 }

    expect(double(obj)).toBe(2)
    expect(double(obj)).toBe(2)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not cache a thrown error, and retries on the next call', () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue(42)

    const cached = memoize(fn)

    expect(() => cached(1)).toThrow('boom')
    expect(cached(1)).toBe(42)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('treats NaN as the same key', () => {
    const fn = vi.fn((n: number) => n)
    const cached = memoize(fn)

    cached(NaN)
    cached(NaN)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
