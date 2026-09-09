import { describe, expect, it, vi } from 'vitest'

import { lazy } from './lazy'

describe('lazy()', () => {
  it('does not call the factory until first access', () => {
    const factory = vi.fn(() => 42)
    lazy(factory)
    expect(factory).not.toHaveBeenCalled()
  })

  it('returns the factory result', () => {
    const getValue = lazy(() => 42)
    expect(getValue()).toBe(42)
  })

  it('calls the factory only once across repeated calls', () => {
    const factory = vi.fn(() => 42)
    const getValue = lazy(factory)
    getValue()
    getValue()
    getValue()
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('returns the same value on every call', () => {
    let n = 0
    const getValue = lazy(() => ++n)
    expect(getValue()).toBe(1)
    expect(getValue()).toBe(1)
  })

  it('supports independent instances with their own state', () => {
    const a = lazy(() => 1)
    const b = lazy(() => 2)
    expect(a()).toBe(1)
    expect(b()).toBe(2)
  })

  it('calls the factory exactly once even when it returns undefined', () => {
    const factory = vi.fn((): number | undefined => undefined)
    const getValue = lazy(factory)
    expect(getValue()).toBeUndefined()
    expect(getValue()).toBeUndefined()
    expect(getValue()).toBeUndefined()
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('calls the factory exactly once even when it returns null/0/false/empty string', () => {
    expect.assertions(4)
    for (const falsy of [null, 0, false, '']) {
      const factory = vi.fn(() => falsy)
      const getValue = lazy(factory)
      getValue()
      getValue()
      expect(factory).toHaveBeenCalledTimes(1)
    }
  })

  it('does not cache a thrown error, and retries on the next call', () => {
    const factory = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })
      .mockReturnValue(42)

    const getValue = lazy(factory)

    expect(() => getValue()).toThrow('boom')
    expect(getValue()).toBe(42)

    expect(factory).toHaveBeenCalledTimes(2)
  })
})
