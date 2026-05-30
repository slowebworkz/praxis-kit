import type { StrictMode } from '../types'

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

  // Always caps at console.warn — never throws. ARIA 'warning' violations route here
  // so they surface even in strict='throw' mode without aborting a render.
  // queueMicrotask defers console.warn past the render commit so diagnostics don't
  // block the frame; the warning still appears before the next macrotask.
  protected warn(message: string): void {
    if (this.strict) {
      queueMicrotask(() => console.warn(message))
    }
  }

  protected invariant(condition: unknown, message: string): void {
    if (!condition) {
      this.violate(message)
    }
  }
}
