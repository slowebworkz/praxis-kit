import type { DiagnosticInput, Diagnostics } from '@praxis-kit/diagnostics'

export abstract class InvariantBase {
  private readonly diagnostics: Diagnostics

  constructor(diagnostics: Diagnostics) {
    this.diagnostics = diagnostics
  }

  protected get active(): boolean {
    return this.diagnostics.active
  }

  protected violate(input: DiagnosticInput): void {
    this.diagnostics.error(input)
  }

  // Always caps at warn — never throws. ARIA 'warning' violations route here
  // so they surface even in strict='throw' mode without aborting a render.
  protected warn(input: DiagnosticInput): void {
    this.diagnostics.warn(input)
  }

  protected invariant(condition: unknown, input: DiagnosticInput): void {
    if (!condition) this.violate(input)
  }
}
