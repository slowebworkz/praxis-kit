import { describe, expect, it } from 'vitest'
import type { Diagnostic } from './diagnostics'
import {
  expectCardinalityDiagnostic,
  expectDiagnostic,
  expectDiagnosticCount,
  expectDiagnosticSeverity,
  expectNoContractDiagnostics,
  expectNoDiagnostics,
  expectNoDiagnosticsOfSeverity,
  filterDiagnostics,
  hasDiagnostic,
} from './diagnostics'

const error = (code: string, message = ''): Diagnostic => ({ code, message, severity: 'error' })
const warning = (code: string, message = ''): Diagnostic => ({ code, message, severity: 'warning' })
const info = (code: string, message = ''): Diagnostic => ({ code, message, severity: 'info' })

describe('filterDiagnostics', () => {
  it('returns only diagnostics matching the given severity', () => {
    const diagnostics = [error('a'), warning('b'), info('c'), error('d')]
    expect(filterDiagnostics(diagnostics, 'error')).toEqual([error('a'), error('d')])
  })

  it('returns an empty array when no match', () => {
    expect(filterDiagnostics([error('a')], 'info')).toEqual([])
  })

  it('returns an empty array for an empty input', () => {
    expect(filterDiagnostics([], 'error')).toEqual([])
  })
})

describe('expectNoDiagnostics', () => {
  it('passes for an empty array', () => {
    expect(() => expectNoDiagnostics([])).not.toThrow()
  })

  it('throws when any diagnostic is present', () => {
    expect(() => expectNoDiagnostics([error('bad-thing')])).toThrow('bad-thing')
  })

  it('includes severity and code in the error message', () => {
    expect(() => expectNoDiagnostics([warning('slot-missing', 'msg')])).toThrow(
      '[warning] slot-missing',
    )
  })
})

describe('hasDiagnostic', () => {
  it('returns true when the code is present', () => {
    expect(hasDiagnostic([error('my-code')], 'my-code')).toBe(true)
  })

  it('returns false when the code is absent', () => {
    expect(hasDiagnostic([error('other')], 'my-code')).toBe(false)
  })

  it('returns false for an empty array', () => {
    expect(hasDiagnostic([], 'my-code')).toBe(false)
  })

  it('matches regardless of severity', () => {
    expect(hasDiagnostic([info('x')], 'x')).toBe(true)
  })
})

describe('expectDiagnostic', () => {
  it('passes when the code is present', () => {
    expect(() => expectDiagnostic([error('my-code')], 'my-code')).not.toThrow()
  })

  it('throws when the code is absent', () => {
    expect(() => expectDiagnostic([error('other')], 'my-code')).toThrow('"my-code"')
  })

  it('matches regardless of severity', () => {
    expect(() => expectDiagnostic([info('my-code')], 'my-code')).not.toThrow()
  })

  it('lists all present codes in the error', () => {
    expect(() => expectDiagnostic([error('a'), warning('b')], 'missing')).toThrow('a')
  })

  it('passes for an empty array', () => {
    expect(() => expectDiagnostic([], 'anything')).toThrow('none')
  })
})

describe('expectDiagnosticCount', () => {
  it('passes when the count matches exactly', () => {
    expect(() => expectDiagnosticCount([error('e'), error('e')], 'e', 2)).not.toThrow()
  })

  it('passes for zero when none are present', () => {
    expect(() => expectDiagnosticCount([], 'e', 0)).not.toThrow()
  })

  it('throws when actual is less than expected', () => {
    expect(() => expectDiagnosticCount([error('e')], 'e', 2)).toThrow('expected 2')
  })

  it('throws when actual is more than expected', () => {
    expect(() => expectDiagnosticCount([error('e'), error('e')], 'e', 1)).toThrow('got 2')
  })

  it('only counts diagnostics matching the given code', () => {
    expect(() => expectDiagnosticCount([error('a'), error('b'), error('a')], 'a', 2)).not.toThrow()
  })
})

describe('expectDiagnosticSeverity', () => {
  it('passes when code and severity both match', () => {
    expect(() => expectDiagnosticSeverity([error('e')], 'e', 'error')).not.toThrow()
  })

  it('throws when code matches but severity does not', () => {
    expect(() => expectDiagnosticSeverity([warning('e')], 'e', 'error')).toThrow('"error"')
  })

  it('throws when severity matches but code does not', () => {
    expect(() => expectDiagnosticSeverity([error('other')], 'e', 'error')).toThrow('"e"')
  })

  it('throws for an empty array', () => {
    expect(() => expectDiagnosticSeverity([], 'e', 'error')).toThrow('none')
  })
})

describe('expectNoDiagnosticsOfSeverity', () => {
  it('passes for an empty array', () => {
    expect(() => expectNoDiagnosticsOfSeverity([], 'error')).not.toThrow()
  })

  it('passes when no diagnostics match the given severity', () => {
    expect(() => expectNoDiagnosticsOfSeverity([info('x')], 'error')).not.toThrow()
  })

  it('throws when a matching severity is present', () => {
    expect(() => expectNoDiagnosticsOfSeverity([error('bad')], 'error')).toThrow('bad')
  })

  it('includes the severity label in the error', () => {
    expect(() => expectNoDiagnosticsOfSeverity([warning('w')], 'warning')).toThrow('"warning"')
  })
})

describe('expectCardinalityDiagnostic', () => {
  it('passes when a cardinality-violation diagnostic is present', () => {
    expect(() => expectCardinalityDiagnostic([error('cardinality-violation')])).not.toThrow()
  })

  it('throws when no cardinality-violation diagnostic is present', () => {
    expect(() => expectCardinalityDiagnostic([error('other')])).toThrow('cardinality-violation')
  })

  it('throws for an empty array', () => {
    expect(() => expectCardinalityDiagnostic([])).toThrow('cardinality-violation')
  })
})

describe('expectNoContractDiagnostics', () => {
  it('passes for an empty array', () => {
    expect(() => expectNoContractDiagnostics([])).not.toThrow()
  })

  it('passes when only info diagnostics are present', () => {
    expect(() => expectNoContractDiagnostics([info('something')])).not.toThrow()
  })

  it('throws when an error diagnostic is present', () => {
    expect(() => expectNoContractDiagnostics([error('bad')])).toThrow('bad')
  })

  it('throws when a warning diagnostic is present', () => {
    expect(() => expectNoContractDiagnostics([warning('bad')])).toThrow('bad')
  })

  it('includes all offending entries in the error message', () => {
    const diagnostics = [error('e1'), warning('w1'), info('i1')]
    expect(() => expectNoContractDiagnostics(diagnostics)).toThrow('e1')
  })
})
