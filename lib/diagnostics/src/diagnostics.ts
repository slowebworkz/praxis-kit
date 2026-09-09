import type { DiagnosticPolicy } from './policy'
import type { Diagnostic, DiagnosticReporter } from './types'
import { PraxisError } from './error'
import { DefaultPolicy, Enforcement } from './policy'
import { Severity } from './severity'

/** The write-side shape: everything on `Diagnostic` except `severity`, which the
 *  `debug`/`info`/`warn`/`error`/`fatal` helpers stamp. */
export type DiagnosticInput = Omit<Diagnostic, 'severity'>

export class Diagnostics {
  private readonly reporter: DiagnosticReporter
  private readonly policy: DiagnosticPolicy

  /** Cheap gate for callers: `false` means a `Severity.Warning` diagnostic would
   *  be ignored by the policy, so warning-level validation work (often the
   *  expensive kind) can be skipped entirely. Precomputed at construction.
   *
   *  Scoped to Warning deliberately — it is **not** a general "diagnostics on"
   *  flag. A policy that ignores Warning but reports Info or throws on Error
   *  still reads `false` here; check the policy directly for other severities. */
  readonly warnActive: boolean

  constructor(reporter: DiagnosticReporter, policy: DiagnosticPolicy = new DefaultPolicy()) {
    this.reporter = reporter
    this.policy = policy
    this.warnActive =
      policy.resolve({ severity: Severity.Warning } as unknown as Diagnostic) !== Enforcement.Ignore
  }

  report(diagnostic: Diagnostic): Diagnostic {
    const enforcement = this.policy.resolve(diagnostic)
    if (enforcement === Enforcement.Ignore) return diagnostic
    if (enforcement === Enforcement.Throw) throw new PraxisError(diagnostic)
    this.reporter.report(diagnostic)
    return diagnostic
  }

  debug(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Debug })
  }

  info(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Info })
  }

  warn(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Warning })
  }

  error(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Error })
  }

  fatal(input: DiagnosticInput): Diagnostic {
    return this.report({ ...input, severity: Severity.Fatal })
  }
}
