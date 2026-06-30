import type { StrictMode } from '../types'
import type { DiagnosticPolicy, DiagnosticReporter } from '@praxis-kit/diagnostics'
import {
  DefaultPolicy,
  Diagnostics,
  Enforcement,
  Severity,
  nullReporter,
} from '@praxis-kit/diagnostics'

const ignoreAllPolicy: DiagnosticPolicy = {
  resolve: () => Enforcement.Ignore,
}

// Raw reporters preserve the existing console.warn(message) output exactly —
// no formatting prefix, no severity label. Replaced in a later phase when
// formatted output is intentionally adopted.

class RawWarnReporter implements DiagnosticReporter {
  private readonly seen = new Set<string>()

  report(d: { message: string }): void {
    if (this.seen.has(d.message)) return
    this.seen.add(d.message)
    console.warn(d.message)
  }
}

class RawAsyncWarnReporter implements DiagnosticReporter {
  private readonly pending = new Set<string>()
  private scheduled = false

  report(d: { message: string }): void {
    if (this.pending.has(d.message)) return
    this.pending.add(d.message)
    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => {
        this.scheduled = false
        const messages = [...this.pending]
        this.pending.clear()
        for (const msg of messages) console.warn(msg)
      })
    }
  }
}

export function diagnosticsFromStrictMode(mode: StrictMode): Diagnostics {
  if (!mode) return new Diagnostics(nullReporter, ignoreAllPolicy)

  const reporter: DiagnosticReporter =
    mode === 'async-warn' ? new RawAsyncWarnReporter() : new RawWarnReporter()

  const policy =
    mode === true || mode === 'throw'
      ? new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Error })
      : new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal })

  return new Diagnostics(reporter, policy)
}
