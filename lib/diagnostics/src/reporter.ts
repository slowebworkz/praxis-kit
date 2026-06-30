import type { Diagnostic } from './diagnostic'

export interface DiagnosticReporter {
  report(diagnostic: Diagnostic): void
}
