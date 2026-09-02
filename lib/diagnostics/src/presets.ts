import { Diagnostics } from './diagnostics'
import { DefaultPolicy, Enforcement } from './policy'
import type { DiagnosticPolicy } from './policy'
import { nullReporter } from './null-reporter'
import { ConsoleReporter } from './console-reporter'
import { Severity } from './severity'
import { formatDiagnostic } from './formatter'
import type { Diagnostic } from './types'

const ignoreAllPolicy: DiagnosticPolicy = {
  resolve(_: Diagnostic) {
    return Enforcement.Ignore
  },
}

const warnOnlyReporter = {
  report(diagnostic: Diagnostic): void {
    console.warn(formatDiagnostic(diagnostic))
  },
}

/** `'silent'` mode — every diagnostic is ignored. */
export const silentDiagnostics = new Diagnostics(nullReporter, ignoreAllPolicy)

/** `'warn'` mode — Warning and above print to the console; only `Fatal` throws. */
export const warnDiagnostics = new Diagnostics(
  warnOnlyReporter,
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
)

/** `'throw'` mode — Warning prints, **`Error` and above throw**. Note this is
 *  "errors throw", not "everything throws"; a Warning is still just logged. */
export const throwDiagnostics = new Diagnostics(
  new ConsoleReporter(),
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Error }),
)
