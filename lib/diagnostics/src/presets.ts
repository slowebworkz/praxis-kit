import { Diagnostics } from './diagnostics'
import { Enforcement } from './policy'
import { DefaultPolicy } from './policy'
import { nullReporter } from './null-reporter'
import { ConsoleReporter } from './console-reporter'
import { Severity } from './severity'
import type { DiagnosticPolicy } from './policy'
import type { Diagnostic } from './types'
import { formatDiagnostic } from './formatter'

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

export const silentDiagnostics = new Diagnostics(nullReporter, ignoreAllPolicy)

export const warnDiagnostics = new Diagnostics(
  warnOnlyReporter,
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
)

export const throwDiagnostics = new Diagnostics(
  new ConsoleReporter(),
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Error }),
)
