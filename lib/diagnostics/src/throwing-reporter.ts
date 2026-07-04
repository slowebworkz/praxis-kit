import type { Diagnostic, DiagnosticReporter } from './types'
import { PraxisError } from './error'

export class ThrowingReporter implements DiagnosticReporter {
  report(diagnostic: Diagnostic): void {
    throw new PraxisError(diagnostic)
  }
}
