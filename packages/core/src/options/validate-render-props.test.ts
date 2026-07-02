import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import type { MockInstance } from 'vitest'
import { validateRenderProps } from './validate-render-props'
import {
  CollectingReporter,
  Diagnostics,
  DefaultPolicy,
  Severity,
  throwDiagnostics,
  silentDiagnostics,
  AsyncConsoleReporter,
} from '@praxis-kit/diagnostics'

const variants = {
  size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

const recipeMap = { cta: { intent: 'primary' }, subtle: { intent: 'ghost' } }

function makeCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

function makeAsyncWarnDiagnostics() {
  return new Diagnostics(
    new AsyncConsoleReporter(),
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
}

// async-warn tests use console.warn spy because they specifically test reporter timing.
let warn: MockInstance

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateRenderProps — strict: false', () => {
  it('is completely silent regardless of violations', () => {
    validateRenderProps(
      silentDiagnostics,
      { variants, recipeMap },
      { size: 'enormous' },
      'nonexistent',
    )
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateRenderProps — unknown recipeKey', () => {
  it('warns when recipeKey names no defined preset (strict: warn)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants, recipeMap }, {}, 'unknown')
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toMatch(/unknown recipeKey "unknown"/i)
  })

  it('throws when recipeKey names no defined preset (strict: throw)', () => {
    expect(() =>
      validateRenderProps(throwDiagnostics, { variants, recipeMap }, {}, 'unknown'),
    ).toThrow(/unknown recipeKey "unknown"/i)
  })

  it('is silent when recipeKey is undefined', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants, recipeMap }, {}, undefined)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('is silent when recipeKey matches a defined preset', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants, recipeMap }, {}, 'cta')
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('includes component name in the message when displayName is set', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants, recipeMap, displayName: 'Button' }, {}, 'unknown')
    expect(reporter.diagnostics[0]!.message).toMatch(/\[Button\]/)
  })

  it('does not treat inherited properties as valid presets', () => {
    const { reporter, diagnostics } = makeCollecting()
    const inherited = Object.create({ inheritedPreset: {} }) as Record<string, unknown>
    validateRenderProps(diagnostics, { variants, recipeMap: inherited }, {}, 'inheritedPreset')
    expect(reporter.diagnostics).toHaveLength(1)
  })
})

describe('validateRenderProps — invalid variant value', () => {
  it('warns when a known variant dimension receives an invalid value (strict: warn)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants }, { size: 'enormous' }, undefined)
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toMatch(/size=enormous/i)
  })

  it('throws when a known variant dimension receives an invalid value (strict: throw)', () => {
    expect(() =>
      validateRenderProps(throwDiagnostics, { variants }, { size: 'enormous' }, undefined),
    ).toThrow(/size=enormous/i)
  })

  it('is silent when all variant props have valid values', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants }, { size: 'sm', intent: 'primary' }, undefined)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('is silent when variant props are omitted (defaults apply)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants }, {}, undefined)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('is silent when variant prop value is null or undefined (treated as unset)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants }, { size: null, intent: undefined }, undefined)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('is silent when no variants are defined on the component', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, {}, { size: 'enormous' }, undefined)
    expect(reporter.diagnostics).toHaveLength(0)
  })
})

describe('validateRenderProps — multiple violations', () => {
  it('reports both preset and variant violations in the same call', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants, recipeMap }, { size: 'enormous' }, 'unknown')
    expect(reporter.diagnostics).toHaveLength(2)
  })

  it('reports all invalid variant dimensions, not just the first', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(
      diagnostics,
      { variants },
      { size: 'enormous', intent: 'mega-primary' },
      undefined,
    )
    expect(reporter.diagnostics).toHaveLength(2)
  })

  it('throws on preset violation before reaching variant violations (strict: throw)', () => {
    expect(() =>
      validateRenderProps(
        throwDiagnostics,
        { variants, recipeMap },
        { size: 'enormous' },
        'unknown',
      ),
    ).toThrow(/unknown recipeKey "unknown"/i)
  })
})

describe('validateRenderProps — runtime type bypass', () => {
  it('warns when a numeric value is passed for a string variant (strict: warn)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateRenderProps(diagnostics, { variants }, { size: 123 as never }, undefined)
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toMatch(/size=123/i)
  })
})

// async-warn uses queueMicrotask internally. Promise.resolve() also resolves
// in the microtask queue, so awaiting it flushes the pending warn batch.
// This is intentional — the contract is specifically microtask semantics.
describe('validateRenderProps — AsyncConsoleReporter batching', () => {
  it('does not call console.warn synchronously', () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    expect(warn).not.toHaveBeenCalled()
  })

  it('calls console.warn after microtask flush', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/unknown recipeKey "unknown"/i)
  })

  it('deduplicates identical messages within the same tick', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
  })

  // Dedup is per-tick: after the microtask flushes, the same message can fire again.
  it('allows the same message to re-fire in a later tick', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('batches multiple distinct violations into one microtask flush with correct messages', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, { size: 'enormous' }, 'unknown')
    expect(warn).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(2)
    const messages = warn.mock.calls.map((c) => c[0] as string)
    expect(messages.some((m) => /unknown recipeKey "unknown"/i.test(m))).toBe(true)
    expect(messages.some((m) => /size=enormous/i.test(m))).toBe(true)
  })

  it('batches three distinct messages without collapsing them', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown1')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown2')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown3')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('deduplicates repeated messages while preserving distinct ones', async () => {
    const d = makeAsyncWarnDiagnostics()
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown1')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown1')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown2')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown2')
    validateRenderProps(d, { variants, recipeMap }, {}, 'unknown3')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('does not throw', () => {
    const d = makeAsyncWarnDiagnostics()
    expect(() => validateRenderProps(d, { variants, recipeMap }, {}, 'unknown')).not.toThrow()
  })
})
