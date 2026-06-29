import type { StrictMode } from '../types'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import { diagnosticsFromStrictMode } from './strict-bridge'

export abstract class StrictBase {
  protected readonly strict: StrictMode
  private readonly diagnostics: Diagnostics

  constructor(strict: StrictMode) {
    this.strict = strict
    this.diagnostics = diagnosticsFromStrictMode(strict)
  }

  protected violate(message: string): void {
    this.diagnostics.error({
      code: DiagnosticCode.InternalError,
      category: DiagnosticCategory.Contract,
      message,
    })
  }

  // Always caps at warn — never throws. ARIA 'warning' violations route here
  // so they surface even in strict='throw' mode without aborting a render.
  protected warn(message: string): void {
    this.diagnostics.warn({
      code: DiagnosticCode.InternalError,
      category: DiagnosticCategory.Contract,
      message,
    })
  }

  protected invariant(condition: unknown, message: string): void {
    if (!condition) {
      this.violate(message)
    }
  }
}

/** No-op shim retained for test compatibility. */
export function _resetAsyncWarns(): void {}
