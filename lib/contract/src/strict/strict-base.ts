import type { Diagnostics } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export abstract class StrictBase {
  private readonly diagnostics: Diagnostics

  constructor(diagnostics: Diagnostics) {
    this.diagnostics = diagnostics
  }

  protected get active(): boolean {
    return this.diagnostics.active
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
