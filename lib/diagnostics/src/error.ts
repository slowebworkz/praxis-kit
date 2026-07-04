import type { Diagnostic } from './diagnostic'

export class PraxisError extends Error {
  readonly diagnostic: Diagnostic

  constructor(diagnostic: Diagnostic) {
    super(diagnostic.message)
    this.name = 'PraxisError'
    this.diagnostic = diagnostic
  }
}
