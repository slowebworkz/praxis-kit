import type { Diagnostic } from './diagnostic'
import type { DiagnosticReporter } from './reporter'
import { PraxisError } from './error'

export class ThrowingReporter implements DiagnosticReporter {
  report(diagnostic: Diagnostic): void {
    throw new PraxisError(diagnostic)
  }
}
