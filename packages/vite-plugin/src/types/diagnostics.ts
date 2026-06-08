import type { Severity } from '@praxis-kit/core'

/** A diagnostic produced by the static analysis pass. */
export type Diagnostic = {
  message: string
  /** 1-based line number in the source file. */
  line: number
  /** 1-based column number. */
  col: number
  /**
   * Uses the same Severity vocabulary as ValidationViolation in
   * @praxis-kit/contract — 'error' | 'warning'. The plugin wrapper maps
   * 'warning' → this.warn() and 'error' → this.error() for Rollup/Vite.
   */
  severity: Severity
}

/** A diagnostic extended with the file it originated from, for buildEnd reporting. */
export type FileDiagnostic = Diagnostic & { fileId: string }
