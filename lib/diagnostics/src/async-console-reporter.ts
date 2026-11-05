import { formatDiagnostic } from './formatter'
import type { Diagnostic, DiagnosticReporter } from './types'

/** A console reporter that batches a microtask's worth of diagnostics into one
 *  flush and drops duplicates within that window.
 *
 *  Dedup key is the **formatted line plus the diagnostic's context**, on purpose:
 *  this reporter's job is console UX — don't print the same line twice. Context is
 *  part of the key because diagnostics are facts, so the printed line is often just
 *  the code; without it, two different problems with the same code (say, two
 *  unknown variants) would collapse into one. Identical code *and* context in the
 *  same window still print once. If you need every distinct diagnostic preserved,
 *  use `CollectingReporter`; this one is not a lossless channel. */
export class AsyncConsoleReporter implements DiagnosticReporter {
  // dedup key → the line to print
  private readonly pending = new Map<string, string>()
  private scheduled = false

  report(diagnostic: Diagnostic): void {
    const line = formatDiagnostic(diagnostic)
    const key = `${line}\u0000${JSON.stringify(diagnostic.context ?? null)}`
    if (this.pending.has(key)) return
    this.pending.set(key, line)
    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => {
        this.scheduled = false
        for (const msg of this.pending.values()) {
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
