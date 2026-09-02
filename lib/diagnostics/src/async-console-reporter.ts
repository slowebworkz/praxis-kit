import { formatDiagnostic } from './formatter'
import type { Diagnostic, DiagnosticReporter } from './types'

/** A console reporter that batches a microtask's worth of diagnostics into one
 *  flush and drops duplicates within that window.
 *
 *  Dedup key is the **formatted string**, on purpose: this reporter's job is
 *  console UX — don't print the same line twice. Two distinct diagnostics that
 *  format identically (same code + message, different file/location) collapse to
 *  one printed line. If you need every distinct diagnostic preserved, use
 *  `CollectingReporter`; this one is not a lossless channel. (A
 *  location-aware key is a possible future refinement if `formatDiagnostic`
 *  stops including enough identity.) */
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
