import type { Diagnostic } from './diagnostic'

/** Sink for diagnostics the policy decided to surface. Implementations decide
 *  what "report" means — collect, print, throw, forward. Injected into
 *  `Diagnostics`; nothing in this package picks one for you. */
export interface DiagnosticReporter {
  report(diagnostic: Diagnostic): void
}
