import { describe, expect, it } from 'vitest'

import { DiagnosticCategory } from './category'
import { DiagnosticCode } from './codes'
import { Diagnostics } from './diagnostics'
import { PraxisError } from './error'
import { CollectingReporter } from './collecting-reporter'
import { DefaultPolicy, Enforcement } from './policy'
import { Severity } from './severity'
import type { DiagnosticInput } from './diagnostics'

const input: DiagnosticInput = {
  code: DiagnosticCode.InvalidChild,
  category: DiagnosticCategory.Composition,
  message: 'Button cannot be a direct child of Menu',
}

describe('DefaultPolicy', () => {
  it('resolves every band around the thresholds', () => {
    const policy = new DefaultPolicy({
      reportThreshold: Severity.Warning,
      throwThreshold: Severity.Error,
    })
    expect(policy.resolve({ severity: Severity.Debug } as never)).toBe(Enforcement.Ignore) // below report
    expect(policy.resolve({ severity: Severity.Warning } as never)).toBe(Enforcement.Report) // at report
    expect(policy.resolve({ severity: Severity.Error } as never)).toBe(Enforcement.Throw) // at throw
    expect(policy.resolve({ severity: Severity.Fatal } as never)).toBe(Enforcement.Throw) // above throw
  })

  it('defaults to report Info+ and throw only at Fatal', () => {
    const policy = new DefaultPolicy()
    expect(policy.resolve({ severity: Severity.Debug } as never)).toBe(Enforcement.Ignore)
    expect(policy.resolve({ severity: Severity.Info } as never)).toBe(Enforcement.Report)
    expect(policy.resolve({ severity: Severity.Error } as never)).toBe(Enforcement.Report)
    expect(policy.resolve({ severity: Severity.Fatal } as never)).toBe(Enforcement.Throw)
  })

  it('rejects a throwThreshold below the reportThreshold', () => {
    expect(
      () =>
        new DefaultPolicy({ reportThreshold: Severity.Error, throwThreshold: Severity.Warning }),
    ).toThrow(RangeError)
  })

  it('allows the thresholds to be equal', () => {
    expect(
      () =>
        new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Warning }),
    ).not.toThrow()
  })
})

describe('Diagnostics facade', () => {
  it('exposes one helper per severity, each stamping its level', () => {
    const reporter = new CollectingReporter()
    const diagnostics = new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Debug, throwThreshold: Severity.Fatal }),
    )

    diagnostics.debug(input)
    diagnostics.info(input)
    diagnostics.warn(input)
    diagnostics.error(input)

    expect(reporter.diagnostics.map((d) => d.severity)).toEqual([
      Severity.Debug,
      Severity.Info,
      Severity.Warning,
      Severity.Error,
    ])
  })

  it('fatal() throws under the default policy', () => {
    const diagnostics = new Diagnostics(new CollectingReporter())
    expect(() => diagnostics.fatal(input)).toThrow(PraxisError)
  })

  it('drops a diagnostic the policy ignores', () => {
    const reporter = new CollectingReporter()
    const diagnostics = new Diagnostics(reporter, new DefaultPolicy({ reportThreshold: Severity.Error }))
    diagnostics.warn(input)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('throws before the reporter is consulted when the policy says Throw', () => {
    const reporter = new CollectingReporter()
    const diagnostics = new Diagnostics(reporter, new DefaultPolicy({ throwThreshold: Severity.Error }))
    expect(() => diagnostics.error(input)).toThrow(PraxisError)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('returns the stamped diagnostic from report helpers', () => {
    const diagnostics = new Diagnostics(new CollectingReporter())
    expect(diagnostics.warn(input)).toMatchObject({ ...input, severity: Severity.Warning })
  })
})

describe('Diagnostics.warnActive', () => {
  it('is true when Warning is not ignored', () => {
    expect(new Diagnostics(new CollectingReporter(), new DefaultPolicy()).warnActive).toBe(true)
  })

  it('is false when Warning is ignored — even if other severities are live', () => {
    // Info reported, Warning ignored would need a custom policy; the DefaultPolicy
    // band is contiguous, so raise the report threshold above Warning.
    const policy = new DefaultPolicy({ reportThreshold: Severity.Error })
    expect(new Diagnostics(new CollectingReporter(), policy).warnActive).toBe(false)
  })
})

describe('PraxisError', () => {
  it('carries the diagnostic and mirrors its message', () => {
    const error = new PraxisError({ ...input, severity: Severity.Error })
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('PraxisError')
    expect(error.message).toBe(input.message)
    expect(error.diagnostic.code).toBe(DiagnosticCode.InvalidChild)
    expect(error.diagnostic.severity).toBe(Severity.Error)
  })
})
