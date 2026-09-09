import type { Diagnostic } from './types'
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
  /** Severities `>=` this are reported. Default `Severity.Info`. */
  reportThreshold?: Severity
  /** Severities `>=` this throw instead. Default `Severity.Fatal`. Must be
   *  `>= reportThreshold` — a throw threshold below the report threshold makes
   *  the report band empty and is always a misconfiguration. */
  throwThreshold?: Severity
}

export class DefaultPolicy implements DiagnosticPolicy {
  private readonly reportThreshold: Severity
  private readonly throwThreshold: Severity

  constructor({
    reportThreshold = Severity.Info,
    throwThreshold = Severity.Fatal,
  }: DefaultPolicyOptions = {}) {
    if (throwThreshold < reportThreshold) {
      throw new RangeError(
        `DefaultPolicy: throwThreshold (${Severity[throwThreshold]}) must be >= ` +
          `reportThreshold (${Severity[reportThreshold]})`,
      )
    }
    this.reportThreshold = reportThreshold
    this.throwThreshold = throwThreshold
  }

  resolve(diagnostic: Diagnostic): Enforcement {
    if (diagnostic.severity >= this.throwThreshold) return Enforcement.Throw
    if (diagnostic.severity >= this.reportThreshold) return Enforcement.Report
    return Enforcement.Ignore
  }
}
