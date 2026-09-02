import type { Diagnostic, DiagnosticReporter } from './types'
import { formatDiagnostic } from './formatter'
import { Severity } from './severity'

export class ConsoleReporter implements DiagnosticReporter {
  report(diagnostic: Diagnostic): void {
    const message = formatDiagnostic(diagnostic)
    switch (diagnostic.severity) {
      case Severity.Debug:
        console.debug(message)
        break
      case Severity.Info:
        console.info(message)
        break
      case Severity.Warning:
        console.warn(message)
        break
      case Severity.Error:
      case Severity.Fatal:
        console.error(message)
        break
    }
  }
}
