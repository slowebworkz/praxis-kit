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

    if (this.strict) {
      console.warn(message)
    }
  }

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
