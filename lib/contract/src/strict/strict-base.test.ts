import { describe, expect, it, vi } from 'vitest'

import { InvariantBase } from './invariant-base'
import { diagnosticsFromStrictMode } from './strict-compat'
import {
  CollectingReporter,
  Diagnostics,
  DefaultPolicy,
  DiagnosticCategory,
  DiagnosticCode,
  Severity,
} from '@praxis-kit/diagnostics'
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

// violate() routes through Diagnostics.error() → Severity.Error.
// warn() routes through Diagnostics.warn() → Severity.Warning.
// warnPolicy: reportThreshold=Warning, throwThreshold=Fatal → reports but never throws
// throwPolicy: reportThreshold=Warning, throwThreshold=Error → warns on Warning, throws on Error
function makeWarnCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

function makeThrowCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Error }),
  )
  return { reporter, diagnostics }
}

// ---------------------------------------------------------------------------
// violate()
// ---------------------------------------------------------------------------

describe('InvariantBase.violate()', () => {
  it('is silent when strict is false', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode(false))
    expect(() => s.callViolate('msg')).not.toThrow()
    // false-mode policy ignores all — verified by strict-compat tests
  })

  it('warns when strict is "warn"', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    s.callViolate('something wrong')
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toBe('something wrong')
  })

  it('does not throw when strict is "warn"', () => {
    const { diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    expect(() => s.callViolate('something wrong')).not.toThrow()
  })

  it('warns exactly once per call when strict is "warn"', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    s.callViolate('first')
    s.callViolate('second')
    expect(reporter.diagnostics).toHaveLength(2)
    expect(reporter.diagnostics[0]!.message).toBe('first')
    expect(reporter.diagnostics[1]!.message).toBe('second')
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
    const s1 = new TestInvariant(diagnosticsFromStrictMode('throw'))
    const s2 = new TestInvariant(diagnosticsFromStrictMode(true))
    expect(() => s1.callViolate('x')).toThrow('x')
    expect(() => s2.callViolate('x')).toThrow('x')
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
    const { reporter, diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    s.callViolate('a')
    s.callViolate('b')
    s.callViolate('c')
    expect(reporter.diagnostics).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// warn()
// ---------------------------------------------------------------------------

describe('InvariantBase.warn()', () => {
  it('is silent when strict is false', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode(false))
    expect(() => s.callWarn('msg')).not.toThrow()
  })

  it('warns when strict is "warn"', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    s.callWarn('something wrong')
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toBe('something wrong')
  })

  it('warns but does not throw when strict is "throw"', () => {
    const { reporter, diagnostics } = makeThrowCollecting()
    const s = new TestInvariant(diagnostics)
    expect(() => s.callWarn('something wrong')).not.toThrow()
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toBe('something wrong')
  })

  it('warns but does not throw when strict is true', () => {
    const { reporter, diagnostics } = makeThrowCollecting()
    const s = new TestInvariant(diagnostics)
    expect(() => s.callWarn('something wrong')).not.toThrow()
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toBe('something wrong')
  })
})

// ---------------------------------------------------------------------------
// invariant()
// ---------------------------------------------------------------------------

describe('InvariantBase.invariant() — truthy conditions never violate', () => {
  it.each([true, 1, -1, 'value', {}, [], () => {}])(
    'does nothing for truthy value %o',
    (condition) => {
      const { reporter, diagnostics } = makeWarnCollecting()
      const s = new TestInvariant(diagnostics)
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
      expect(reporter.diagnostics).toHaveLength(0)
    },
  )
})

describe('InvariantBase.invariant() — falsy conditions delegate to violate()', () => {
  it.each([false, null, undefined, 0, '', NaN])(
    'delegates for falsy value %o when strict is "warn"',
    (condition) => {
      const { reporter, diagnostics } = makeWarnCollecting()
      const s = new TestInvariant(diagnostics)
      s.callInvariant(condition, 'invariant failed')
      expect(reporter.diagnostics).toHaveLength(1)
      expect(reporter.diagnostics[0]!.message).toBe('invariant failed')
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
      const s = new TestInvariant(diagnosticsFromStrictMode(false))
      expect(() => s.callInvariant(condition, 'msg')).not.toThrow()
    },
  )
})

describe('InvariantBase.invariant() — message forwarding', () => {
  it('passes the exact message to the reporter', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const s = new TestInvariant(diagnostics)
    s.callInvariant(false, 'exact invariant message')
    expect(reporter.diagnostics[0]!.message).toBe('exact invariant message')
  })

  it('passes the exact message to the thrown Error', () => {
    const s = new TestInvariant(diagnosticsFromStrictMode('throw'))
    expect(() => s.callInvariant(false, 'exact invariant message')).toThrow(
      'exact invariant message',
    )
  })
})

// ---------------------------------------------------------------------------
// async-warn — tests reporter timing via console.warn; must stay as console spies
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
