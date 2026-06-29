import type { Diagnostic } from './diagnostic'
import type { DiagnosticPolicy } from './policy'
import type { DiagnosticReporter } from './reporter'
import { PraxisError } from './error'
import { DefaultPolicy, Enforcement } from './policy'
import { Severity } from './severity'
import type { Except } from 'type-fest'

type DiagnosticInput = Except<Diagnostic, 'severity'>

export class Diagnostics {
  private readonly reporter: DiagnosticReporter
  private readonly policy: DiagnosticPolicy

  constructor(reporter: DiagnosticReporter, policy: DiagnosticPolicy = new DefaultPolicy()) {
    this.reporter = reporter
    this.policy = policy
  }

  report(diagnostic: Diagnostic): Diagnostic {
    const enforcement = this.policy.resolve(diagnostic)
    if (enforcement === Enforcement.Ignore) return diagnostic
    if (enforcement === Enforcement.Throw) throw new PraxisError(diagnostic)
    this.reporter.report(diagnostic)
    return diagnostic
  }

  warn(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Warning })
  }

  error(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Error })
  }

  info(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Info })
  }
}
