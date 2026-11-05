import type { Diagnostic } from '@praxis-kit/diagnostics'
import { PraxisError } from '@praxis-kit/diagnostics'

/**
 * Runs `fn`, which is expected to throw a `PraxisError`, and returns the diagnostic it carried.
 * Diagnostics are facts (a code plus context), so a throw-mode test asserts on those rather than on
 * message prose.
 */
export function thrownDiagnostic(fn: () => unknown): Diagnostic {
  try {
    fn()
  } catch (error) {
    if (error instanceof PraxisError) return error.diagnostic
    throw error
  }
  throw new Error('expected the call to throw a PraxisError, but it returned normally')
}
