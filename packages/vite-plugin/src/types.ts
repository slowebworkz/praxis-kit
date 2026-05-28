import type { Cardinality, ChildRulePosition, Severity } from '@praxis-ui/core'

export type { Cardinality, ChildRulePosition, Severity }

/**
 * One enforcement.children rule whose cardinality is statically extractable
 * from the factory call AST. The `Cardinality` discriminated union matches the
 * shape used by the runtime `ChildrenEvaluator` — unbounded rules contribute
 * Infinity to `totalMax`.
 */
export type StaticBound = {
  cardinality: Cardinality
  position: ChildRulePosition
}

/**
 * A component definition collected from a createPolymorphicComponent /
 * createContractComponent call whose enforcement.children array contains at
 * least one rule with a statically-extractable cardinality.
 */
export type ComponentConstraint = {
  /** Variable name the component is bound to (e.g. "Button"). */
  name: string
  /** One entry per ChildRuleInput whose cardinality is a literal object. */
  rules: StaticBound[]
  /** Sum of all rule.cardinality.min values. */
  totalMin: number
  /** Sum of all rule.cardinality.max values; Infinity if any rule is unbounded. */
  totalMax: number
  /** The default HTML tag declared in the factory call (`tag: 'button'`), if statically present. */
  defaultTag?: string
  /** True when `enforcement.aria` is a non-empty array literal in the factory call. */
  hasAriaRules: boolean
}

/** A diagnostic produced by the static analysis pass. */
export type Diagnostic = {
  message: string
  /** 1-based line number in the source file. */
  line: number
  /** 1-based column number. */
  col: number
  /**
   * Uses the same Severity vocabulary as ValidationViolation in
   * @praxis-ui/contract — 'error' | 'warning'. The plugin wrapper maps
   * 'warning' → this.warn() and 'error' → this.error() for Rollup/Vite.
   */
  severity: Severity
}

/**
 * A JSX usage site collected for deferred cross-file cardinality validation.
 * Stored during `transform` and validated in `buildEnd` once the full
 * constraint registry is populated.
 */
export type PendingUsage = {
  tagName: string
  /** Number of static children; undefined when children contain JSX expressions. */
  count: number | undefined
  /** 1-based line number. */
  line: number
  /** 1-based column number. */
  col: number
}

/** A diagnostic extended with the file it originated from, for buildEnd reporting. */
export type FileDiagnostic = Diagnostic & { fileId: string }

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
