import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AsyncConsoleReporter } from './async-console-reporter'
import { DiagnosticCategory } from './category'
import { DiagnosticCode } from './codes'
import { Severity } from './severity'
import type { Diagnostic } from './types'

const make = (over: Partial<Diagnostic> = {}): Diagnostic => ({
  code: DiagnosticCode.InvalidChild,
  category: DiagnosticCategory.Composition,
  severity: Severity.Warning,
  message: 'Button cannot be a direct child of Menu',
  ...over,
})

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('AsyncConsoleReporter', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => warn.mockRestore())

  it('batches a microtask worth of diagnostics into one flush', async () => {
    const reporter = new AsyncConsoleReporter()
    reporter.report(make({ message: 'a' }))
    reporter.report(make({ message: 'b' }))
    expect(warn).not.toHaveBeenCalled() // nothing synchronous
    await flush()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('deduplicates diagnostics that format identically within a flush', async () => {
    const reporter = new AsyncConsoleReporter()
    reporter.report(make())
    reporter.report(make())
    await flush()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('keeps diagnostics that format differently', async () => {
    const reporter = new AsyncConsoleReporter()
    reporter.report(make({ code: DiagnosticCode.InvalidParent, message: 'x' }))
    reporter.report(make({ code: DiagnosticCode.InvalidChild, message: 'y' }))
    await flush()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('clears pending after a flush, so a later identical diagnostic prints again', async () => {
    const reporter = new AsyncConsoleReporter()
    reporter.report(make())
    await flush()
    reporter.report(make())
    await flush()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('reset() drops pending diagnostics before they flush', async () => {
    const reporter = new AsyncConsoleReporter()
    reporter.report(make())
    reporter.reset()
    await flush()
    expect(warn).not.toHaveBeenCalled()
  })
})
