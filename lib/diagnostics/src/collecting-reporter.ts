import type { Diagnostic } from './diagnostic'
import type { DiagnosticReporter } from './reporter'

export class CollectingReporter implements DiagnosticReporter {
  private readonly collected: Diagnostic[] = []

  report(diagnostic: Diagnostic): void {
    this.collected.push(diagnostic)
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.collected
  }

  clear(): void {
    this.collected.length = 0
  }
}
