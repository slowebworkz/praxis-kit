import type { Severity } from '@praxis-kit/core'

/** Options accepted by contractPlugin() and analyze(). */
export type PluginOptions = {
  /**
   * Factory function names to look for.
   * @default ['createPolymorphicComponent', 'createContractComponent']
   */
  calleeNames?: string[]
  /**
   * Severity of cardinality violations in Vite build output.
   * Matches the Severity vocabulary used by ValidationViolation.
   * @default 'warning'
   */
  severity?: Severity
}
