import type { DiagnosticPolicy } from './policy'
import type { Diagnostic, DiagnosticReporter, MessageResolver } from './types'
import { PraxisError } from './error'
import { isDefined, isUndefined } from './guards'
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
  /** Report-only preset: validation must not silently normalize the caller's props. */
  readonly reportOnly: boolean
  /** Supplies text for diagnostics reported through this instance. Instance-scoped on purpose: two
   *  instances can use different locales at once. `undefined` ⇒ diagnostics carry no text and
   *  formatters fall back to the code. */
  readonly resolveMessage: MessageResolver | undefined

  constructor(
    reporter: DiagnosticReporter,
    policy: DiagnosticPolicy = new DefaultPolicy(),
    options: { reportOnly?: boolean; resolveMessage?: MessageResolver } = {},
  ) {
    this.reporter = reporter
    this.policy = policy
    this.reportOnly = options.reportOnly ?? false
    this.resolveMessage = options.resolveMessage
    this.warnActive =
      policy.resolve({ severity: Severity.Warning } as unknown as Diagnostic) !== Enforcement.Ignore
  }

  /** Whether validation fixes (e.g. stripping an invalid `role`) should be applied to the
   * caller's props. Report-only presets (`'warn'`) preserve the input; throwing and ignore
   * policies retain the legacy fix behavior. */
  shouldApplyFix(): boolean {
    return !this.reportOnly
  }

  /** A copy of this instance (same reporter and policy) that resolves text with `resolver`. */
  withMessages(resolver: MessageResolver | undefined): Diagnostics {
    return new Diagnostics(this.reporter, this.policy, {
      reportOnly: this.reportOnly,
      ...(isDefined(resolver) && { resolveMessage: resolver }),
    })
  }

  /** Attaches resolver text to a diagnostic. Text the diagnostic already carries always wins. */
  describe(diagnostic: Diagnostic): Diagnostic {
    if (isUndefined(this.resolveMessage)) return diagnostic
    const text = this.resolveMessage(diagnostic)
    if (isUndefined(text)) return diagnostic
    return {
      ...diagnostic,
      ...(isUndefined(diagnostic.message) && isDefined(text.message) && { message: text.message }),
      ...(isUndefined(diagnostic.rationale) &&
        isDefined(text.rationale) && { rationale: text.rationale }),
      ...(isUndefined(diagnostic.suggestions) &&
        isDefined(text.suggestions) && { suggestions: text.suggestions }),
    }
  }

  report(input: Diagnostic): Diagnostic {
    const diagnostic = this.describe(input)
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
