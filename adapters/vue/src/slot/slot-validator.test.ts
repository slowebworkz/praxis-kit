import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CollectingReporter,
  DefaultPolicy,
  Diagnostics,
  PraxisError,
  Severity,
  throwDiagnostics,
  warnDiagnostics,
  silentDiagnostics,
} from '@praxis-kit/diagnostics'
import { SlotValidator } from '@praxis-kit/adapter-utils'

afterEach(() => vi.restoreAllMocks())

// Diagnostics are facts (a code plus context); console output is just the code. To check which
// component or count a diagnostic was about, read its context instead.
const collecting = () => {
  const reporter = new CollectingReporter()
  return {
    reporter,
    diagnostics: new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Warning }),
    ),
  }
}

describe('assertExclusive', () => {
  it('throws with the component name when strict is throw', () => {
    expect(() => new SlotValidator('Button', throwDiagnostics, 'VNode').assertExclusive()).toThrow(
      'SLOT1001',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Button', warnDiagnostics, 'VNode').assertExclusive()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SLOT1001'))
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Button', silentDiagnostics, 'VNode').assertExclusive(),
    ).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('assertSingleChild', () => {
  it('throws with count in message when strict is throw', () => {
    expect(() => new SlotValidator('Icon', throwDiagnostics, 'VNode').assertSingleChild(3)).toThrow(
      'SLOT1002',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Icon', warnDiagnostics, 'VNode').assertSingleChild(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SLOT1002'))
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Icon', silentDiagnostics, 'VNode').assertSingleChild(0),
    ).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('carries the component name and count on the thrown diagnostic', () => {
    let thrown: unknown
    try {
      new SlotValidator('MyCard', throwDiagnostics, 'VNode').assertSingleChild(2)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(PraxisError)
    expect((thrown as PraxisError).diagnostic.context).toMatchObject({ name: 'MyCard', count: 2 })
  })
})

describe('warnDiscardedChildren', () => {
  it('warns (not throws) even when strict is throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Box', throwDiagnostics, 'VNode').warnDiscardedChildren(1),
    ).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SLOT1003'))
  })

  it('reports a count of 1 (the catalog picks the singular form from it)', () => {
    const { reporter, diagnostics } = collecting()
    new SlotValidator('Box', diagnostics, 'VNode').warnDiscardedChildren(1)
    expect(reporter.diagnostics[0]?.context).toMatchObject({ count: 1 })
  })

  it('reports a count above 1 (the catalog picks the plural form from it)', () => {
    const { reporter, diagnostics } = collecting()
    new SlotValidator('Box', diagnostics, 'VNode').warnDiscardedChildren(3)
    expect(reporter.diagnostics[0]?.context).toMatchObject({ count: 3 })
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Box', silentDiagnostics, 'VNode').warnDiscardedChildren(2)
    expect(warn).not.toHaveBeenCalled()
  })

  it('carries the component name on the warning', () => {
    const { reporter, diagnostics } = collecting()
    new SlotValidator('Dialog', diagnostics, 'VNode').warnDiscardedChildren(1)
    expect(reporter.diagnostics[0]?.context).toMatchObject({ name: 'Dialog', count: 1 })
  })
})
