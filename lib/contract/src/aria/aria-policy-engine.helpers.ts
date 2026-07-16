import { AriaPolicyEngine } from './polymorphic-validator'
import {
  CollectingReporter,
  Diagnostics,
  DefaultPolicy,
  Severity,
  warnDiagnostics,
} from '@praxis-kit/diagnostics'

export function makeCollecting() {
  const reporter = new CollectingReporter()
  const engine = new AriaPolicyEngine(
    new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
    ),
  )
  return { reporter, engine }
}

export function makeValidator(diagnostics: Diagnostics = warnDiagnostics) {
  return new AriaPolicyEngine(diagnostics)
}
