import type { Diagnostic } from './types'

export class PraxisError extends Error {
  readonly diagnostic: Diagnostic

  constructor(diagnostic: Diagnostic) {
    super(diagnostic.message)
    this.name = 'PraxisError'
    this.diagnostic = diagnostic
  }
}
