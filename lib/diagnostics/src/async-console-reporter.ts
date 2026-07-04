import { formatDiagnostic } from './formatter'
import type { Diagnostic, DiagnosticReporter } from './types'

export class AsyncConsoleReporter implements DiagnosticReporter {
  private readonly pending = new Set<string>()
  private scheduled = false

  report(diagnostic: Diagnostic): void {
    const message = formatDiagnostic(diagnostic)
    if (this.pending.has(message)) return
    this.pending.add(message)
    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => {
        this.scheduled = false
        for (const msg of this.pending) {
          console.warn(msg)
        }
        this.pending.clear()
      })
    }
  }

  /** Clears pending messages. Exposed for test isolation only. */
  reset(): void {
    this.pending.clear()
    this.scheduled = false
  }
}
