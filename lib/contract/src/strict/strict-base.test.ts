import { describe, expect, it, vi } from 'vitest'

import { InvariantBase } from './invariant-base'
import { diagnosticsFromStrictMode } from './strict-bridge'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { DiagnosticInput } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// Concrete subclass — InvariantBase is abstract
// ---------------------------------------------------------------------------

function d(message: string): DiagnosticInput {
  return { code: DiagnosticCode.InternalError, category: DiagnosticCategory.Internal, message }
}

class TestInvariant extends InvariantBase {
  callViolate(message: string) {
    this.violate(d(message))
  }

  callWarn(message: string) {
    this.warn(d(message))
  }

  callInvariant(condition: unknown, message: string) {
    this.invariant(condition, d(message))
  }
}

// ---------------------------------------------------------------------------
// violate()
// ---------------------------------------------------------------------------

describe('InvariantBase.violate()', () => {
  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode(false))
    expect(() => s.callViolate('msg')).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    s.callViolate('something wrong')
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('does not throw when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    expect(() => s.callViolate('something wrong')).not.toThrow()
    spy.mockRestore()
  })

  it('warns exactly once per call when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    s.callViolate('first')
    s.callViolate('second')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, 'first')
    expect(spy).toHaveBeenNthCalledWith(2, 'second')
    spy.mockRestore()
  })

  it('throws when strict is "throw"', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    expect(() => s.callViolate('bad')).toThrow('bad')
  })

  it('throws an Error instance when strict is "throw"', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    expect(() => s.callViolate('bad')).toThrow(Error)
  })

  it('throws when strict is true', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode(true))
    expect(() => s.callViolate('bad')).toThrow('bad')
  })

  it('throws an Error instance when strict is true', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode(true))
    expect(() => s.callViolate('bad')).toThrow(Error)
  })

  it('true and "throw" produce identical behavior', () => {
    const throwStr = new TestInvariant(diagnosticsFromStrictMode('throw'))
    const throwBool = new TestInvariant(diagnosticsFromStrictMode(true))
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => throwStr.callViolate('x')).toThrow('x')
    expect(() => throwBool.callViolate('x')).toThrow('x')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('preserves the exact message in the thrown Error', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    let caught: unknown
    try {
      s.callViolate('exact message')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('exact message')
  })

  it('is stateless — mode does not change between calls', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    s.callViolate('a')
    s.callViolate('b')
    s.callViolate('c')
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// warn()
// ---------------------------------------------------------------------------

describe('InvariantBase.warn()', () => {
  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode(false))
    expect(() => s.callWarn('msg')).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    s.callWarn('something wrong')
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('warns but does not throw when strict is "throw"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    expect(() => s.callWarn('something wrong')).not.toThrow()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })

  it('warns but does not throw when strict is true', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode(true))
    expect(() => s.callWarn('something wrong')).not.toThrow()
    expect(spy).toHaveBeenCalledWith('something wrong')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// invariant()
// ---------------------------------------------------------------------------

describe('InvariantBase.invariant() — truthy conditions never violate', () => {
  it.each([true, 1, -1, 'value', {}, [], () => {}])(
    'does nothing for truthy value %o',
    (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    },
  )
})

describe('InvariantBase.invariant() — falsy conditions delegate to violate()', () => {
  it.each([false, null, undefined, 0, '', NaN])(
    'delegates for falsy value %o when strict is "warn"',
    (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
      s.callInvariant(condition, 'invariant failed')
      expect(spy).toHaveBeenCalledWith('invariant failed')
      spy.mockRestore()
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'throws for falsy value %o when strict is "throw"',
    (condition) => {
      const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
      expect(() => s.callInvariant(condition, 'invariant failed')).toThrow('invariant failed')
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'throws for falsy value %o when strict is true',
    (condition) => {
      const s = new TestInvariant(diagnosticsFromStrictMode(true))
      expect(() => s.callInvariant(condition, 'invariant failed')).toThrow('invariant failed')
    },
  )

  it.each([false, null, undefined, 0, '', NaN])(
    'is silent for falsy value %o when strict is false',
    (condition) => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const s = new TestInvariant(diagnosticsFromStrictMode(false))
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    },
  )
})

describe('InvariantBase.invariant() — message forwarding', () => {
  it('passes the exact message to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('warn'))
    s.callInvariant(false, 'exact invariant message')
    expect(spy).toHaveBeenCalledWith('exact invariant message')
    spy.mockRestore()
  })

  it('passes the exact message to the thrown Error', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    expect(() => s.callInvariant(false, 'exact invariant message')).toThrow(
      'exact invariant message',
    )
  })
})

// ---------------------------------------------------------------------------
// async-warn
// ---------------------------------------------------------------------------

describe("InvariantBase.warn() — 'async-warn' mode", () => {
  it('does not call console.warn synchronously', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    s.callWarn('deferred')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('calls console.warn after microtask flush', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    s.callWarn('deferred')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('deferred')
    spy.mockRestore()
  })

  it('deduplicates identical messages within the same tick', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    s.callWarn('dup')
    s.callWarn('dup')
    s.callWarn('dup')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('dup')
    spy.mockRestore()
  })

  it('flushes all unique messages in a single microtask', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    s.callWarn('a')
    s.callWarn('b')
    s.callWarn('c')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })

  it('allows the same message to re-fire in a later tick', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    s.callWarn('repeat')
    await Promise.resolve()
    s.callWarn('repeat')
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('does not throw even when strict is async-warn', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = new TestInvariant(diagnosticsFromStrictMode('async-warn'))
    expect(() => s.callViolate('violation')).not.toThrow()
    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith('violation')
    spy.mockRestore()
  })
})
