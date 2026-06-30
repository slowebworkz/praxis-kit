import type { Diagnostic } from './diagnostic'
import { Severity } from './severity'

export enum Enforcement {
  Ignore,
  Report,
  Throw,
}

export interface DiagnosticPolicy {
  resolve(diagnostic: Diagnostic): Enforcement
}

export interface DefaultPolicyOptions {
  reportThreshold?: Severity
  throwThreshold?: Severity
}

export class DefaultPolicy implements DiagnosticPolicy {
  private readonly reportThreshold: Severity
  private readonly throwThreshold: Severity

  constructor({
    reportThreshold = Severity.Info,
    throwThreshold = Severity.Fatal,
  }: DefaultPolicyOptions = {}) {
    this.reportThreshold = reportThreshold
    this.throwThreshold = throwThreshold
  }

  resolve(diagnostic: Diagnostic): Enforcement {
    if (diagnostic.severity >= this.throwThreshold) return Enforcement.Throw
    if (diagnostic.severity >= this.reportThreshold) return Enforcement.Report
    return Enforcement.Ignore
  }
}
