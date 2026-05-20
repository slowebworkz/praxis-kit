import type { StrictMode } from '../types'

/**
 * Abstract base class shared by all validation systems.
 *
 * Centralizes strict-mode behavior so every validator (`AriaPolicyEngine`,
 * `ChildrenEvaluator`, `RuleValidator`, `MatchValidator`) responds to the
 * same `strict` setting with identical semantics.
 *
 * Use `violate()` for structural errors that should throw in strict mode.
 * Use `warn()` for advisory violations that must never abort a render (e.g. ARIA warnings).
 */
export abstract class StrictBase {
  protected readonly strict: StrictMode

  constructor(strict: StrictMode) {
    this.strict = strict
  }

  protected violate(message: string): void {
    if (this.strict === true || this.strict === 'throw') {
      throw new Error(message)
    }
    this.warn(message)
  }

  // Always caps at console.warn — never throws. AriaPolicyEngine routes 'warning' severity
  // violations here so they surface even in strict='throw' mode without aborting a render.
  protected warn(message: string): void {
    if (this.strict) {
      console.warn(message)
    }
  }

  protected invariant(condition: unknown, message: string): void {
    if (!condition) {
      this.violate(message)
    }
  }
}
