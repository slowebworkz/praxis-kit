import { describe, expect, it, vi } from 'vitest'

import { StrictBase } from './strict-base'

// ---------------------------------------------------------------------------
// Concrete subclass — StrictBase is abstract
// ---------------------------------------------------------------------------

class TestStrict extends StrictBase {
  callViolate(message: string) {
    this.violate(message)
  }

  callWarn(message: string) {
    this.warn(message)
  }

  callInvariant(condition: unknown, message: string) {
    this.invariant(condition, message)
  }
}

// ---------------------------------------------------------------------------
// violate()
// ---------------------------------------------------------------------------

describe('StrictBase.violate()', () => {
  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict(false)
    expect(() => s.callViolate('msg')).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when strict is "warn"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    s.callViolate('something wrong')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('does not throw when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    expect(() => s.callViolate('something wrong')).not.toThrow()
    spy.mockRestore()
  })

  it('warns exactly once per call when strict is "warn"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    s.callViolate('first')
    s.callViolate('second')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, 'first')
    expect(spy).toHaveBeenNthCalledWith(2, 'second')
    spy.mockRestore()
  })

  it('throws when strict is "throw"', () => {
    const s = new TestStrict('throw')
    expect(() => s.callViolate('bad')).toThrow('bad')
  })

  it('throws an Error instance when strict is "throw"', () => {
    const s = new TestStrict('throw')
    expect(() => s.callViolate('bad')).toThrow(Error)
  })

  it('throws when strict is true', () => {
    const s = new TestStrict(true)
    expect(() => s.callViolate('bad')).toThrow('bad')
  })

  it('throws an Error instance when strict is true', () => {
    const s = new TestStrict(true)
    expect(() => s.callViolate('bad')).toThrow(Error)
  })

  it('true and "throw" produce identical behavior', () => {
    const throwStr = new TestStrict('throw')
    const throwBool = new TestStrict(true)
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => throwStr.callViolate('x')).toThrow('x')
    expect(() => throwBool.callViolate('x')).toThrow('x')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('preserves the exact message in the thrown Error', () => {
    const s = new TestStrict('throw')
    let caught: unknown
    try {
      s.callViolate('exact message')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('exact message')
  })

  it('is stateless — mode does not change between calls', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    s.callViolate('a')
    s.callViolate('b')
    s.callViolate('c')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// warn()
// ---------------------------------------------------------------------------

describe('StrictBase.warn()', () => {
  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict(false)
    expect(() => s.callWarn('msg')).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when strict is "warn"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    s.callWarn('something wrong')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('warns but does not throw when strict is "throw"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('throw')
    expect(() => s.callWarn('something wrong')).not.toThrow()
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('warns but does not throw when strict is true', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict(true)
    expect(() => s.callWarn('something wrong')).not.toThrow()
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// invariant()
// ---------------------------------------------------------------------------

describe('StrictBase.invariant() — truthy conditions never violate', () => {
  it.each([true, 1, -1, 'value', {}, [], () => {}])(
    'does nothing for truthy value %o',
    (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestStrict('warn')
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    },
  )
})

describe('StrictBase.invariant() — falsy conditions delegate to violate()', () => {
  it.each([false, null, undefined, 0, '', NaN])(
    'delegates for falsy value %o when strict is "warn"',
    async (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestStrict('warn')
      s.callInvariant(condition, 'invariant failed')
      await Promise.resolve()
      expect(spy).toHaveBeenCalledWith('invariant failed')
      spy.mockRestore()
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'throws for falsy value %o when strict is "throw"',
    (condition) => {
      const s = new TestStrict('throw')
      expect(() => s.callInvariant(condition, 'invariant failed')).toThrow('invariant failed')
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'throws for falsy value %o when strict is true',
    (condition) => {
      const s = new TestStrict(true)
      expect(() => s.callInvariant(condition, 'invariant failed')).toThrow('invariant failed')
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'is silent for falsy value %o when strict is false',
    (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestStrict(false)
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    },
  )
})

describe('StrictBase.invariant() — message forwarding', () => {
  it('passes the exact message to console.warn', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestStrict('warn')
    s.callInvariant(false, 'exact invariant message')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('exact invariant message')
    spy.mockRestore()
  })

  it('passes the exact message to the thrown Error', () => {
    const s = new TestStrict('throw')
    expect(() => s.callInvariant(false, 'exact invariant message')).toThrow(
      'exact invariant message',
    )
  })
})
