import type { Diagnostic } from '@pk2/pipeline'

export type { Diagnostic }

export function filterDiagnostics(
  diagnostics: Diagnostic[],
  severity: Diagnostic['severity'],
): Diagnostic[] {
  return diagnostics.filter((d) => d.severity === severity)
}

/**
 * Assert that the diagnostics array is empty.
 */
export function expectNoDiagnostics(diagnostics: Diagnostic[]): void {
  if (diagnostics.length > 0) {
    const lines = diagnostics.map((d) => `  [${d.severity}] ${d.code}: ${d.message}`).join('\n')
    throw new Error(`expectNoDiagnostics: unexpected diagnostics:\n${lines}`)
  }
}

/**
 * Non-throwing predicate — useful with expect(hasDiagnostic(...)).toBe(true).
 */
export function hasDiagnostic(diagnostics: Diagnostic[], code: string): boolean {
  return diagnostics.some((d) => d.code === code)
}

/**
 * Assert that at least one diagnostic matches the given code.
 */
export function expectDiagnostic(diagnostics: Diagnostic[], code: string): void {
  const matched = diagnostics.some((d) => d.code === code)
  if (!matched) {
    const all = diagnostics.map((d) => `  [${d.severity}] ${d.code}`).join('\n') || '  (none)'
    throw new Error(
      `expectDiagnostic: no diagnostic with code "${code}".\nAll diagnostics:\n${all}`,
    )
  }
}

/**
 * Assert that exactly `count` diagnostics match the given code.
 * Useful when duplicate violations matter — e.g. two cardinality errors on different nodes.
 */
export function expectDiagnosticCount(
  diagnostics: Diagnostic[],
  code: string,
  count: number,
): void {
  const actual = diagnostics.filter((d) => d.code === code).length
  if (actual !== count) {
    throw new Error(
      `expectDiagnosticCount: expected ${count} "${code}" diagnostic(s), got ${actual}`,
    )
  }
}

/**
 * Assert that at least one diagnostic matches both code and severity.
 */
export function expectDiagnosticSeverity(
  diagnostics: Diagnostic[],
  code: string,
  severity: Diagnostic['severity'],
): void {
  const matched = diagnostics.some((d) => d.code === code && d.severity === severity)
  if (!matched) {
    const all = diagnostics.map((d) => `  [${d.severity}] ${d.code}`).join('\n') || '  (none)'
    throw new Error(
      `expectDiagnosticSeverity: no diagnostic with code "${code}" and severity "${severity}".\nAll diagnostics:\n${all}`,
    )
  }
}

/**
 * Assert no diagnostics with the given severity are present.
 */
export function expectNoDiagnosticsOfSeverity(
  diagnostics: Diagnostic[],
  severity: Diagnostic['severity'],
): void {
  const matched = filterDiagnostics(diagnostics, severity)
  if (matched.length > 0) {
    const lines = matched.map((d) => `  [${d.severity}] ${d.code}: ${d.message}`).join('\n')
    throw new Error(`expectNoDiagnosticSeverity: unexpected "${severity}" diagnostics:\n${lines}`)
  }
}

/**
 * Assert that at least one diagnostic matches a cardinality violation.
 * PK2 replacement for expectCardinalityWarning — reads from Diagnostic[] rather
 * than intercepting the console.
 */
export function expectCardinalityDiagnostic(diagnostics: Diagnostic[]): void {
  expectDiagnostic(diagnostics, 'cardinality-violation')
}

/**
 * Assert that no contract diagnostics of warning or error severity are present.
 * PK2 replacement for expectNoContractWarnings.
 */
export function expectNoContractDiagnostics(diagnostics: Diagnostic[]): void {
  const contractDiagnostics = diagnostics.filter(
    (d) => d.severity === 'error' || d.severity === 'warning',
  )
  if (contractDiagnostics.length > 0) {
    const lines = contractDiagnostics
      .map((d) => `  [${d.severity}] ${d.code}: ${d.message}`)
      .join('\n')
    throw new Error(`expectNoContractDiagnostics: unexpected contract diagnostics:\n${lines}`)
  }
}
