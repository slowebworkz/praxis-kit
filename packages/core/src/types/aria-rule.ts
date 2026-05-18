import type { ReadonlyDeep } from 'type-fest'
import type { AriaRole, IntrinsicProps, IntrinsicTag } from './primitives'

/**
 * The result of applying a single `AriaFix` to a props object.
 *
 * `applied: false` means the fix had no precondition satisfied (e.g. `role` was already absent).
 * `applied: true` includes both the transformed `next` props and the `previous` snapshot.
 */
export type AriaFixResult =
  | {
      applied: false
      next: ReadonlyDeep<IntrinsicProps>
    }
  | {
      applied: true
      next: ReadonlyDeep<IntrinsicProps>
      previous: ReadonlyDeep<IntrinsicProps>
    }

/**
 * Identifies the kind of mutation an `AriaFix` performs.
 *
 * Used for deduplication in the fix phase: at most one fix per `FixKind` runs,
 * regardless of how many rules emitted it. Known values are `'removeRole'` and
 * `'setRole'`; the `string & {}` tail admits future kinds without collapsing
 * autocomplete on the known literals.
 */
export type FixKind = 'removeRole' | 'setRole' | (string & {})

/**
 * A self-contained fix action emitted by an ARIA rule when `fixable: true`.
 *
 * `kind` is used to deduplicate fixes across rules. `apply` receives the current
 * props snapshot and returns an `AriaFixResult` indicating whether it mutated anything.
 */
export type AriaFix = {
  readonly kind: FixKind
  readonly apply: (context: AriaContext) => AriaFixResult
}

export type ValidResult = { valid: true }

type Severity = 'error' | 'warning'

type InvalidBase = {
  valid: false
  severity: Severity
  message: string
}

/**
 * An invalid rule result that carries an auto-fix.
 * The fix is deduplicated by `kind` before the fix phase runs.
 */
export type InvalidWithFix = InvalidBase & {
  fixable: true
  fix: AriaFix
}

/** An invalid rule result with no available auto-fix. */
export type InvalidWithoutFix = InvalidBase & {
  fixable: false
}

/** Discriminated union returned by every `AriaRule`. */
export type InvalidResult = InvalidWithFix | InvalidWithoutFix

/** The full return type of an `AriaRule` — valid or invalid (with or without a fix). */
export type AriaResult = ValidResult | InvalidResult

/**
 * Identifies which phase of the engine produced a `ValidationViolation`.
 *
 * `'evaluate'` — the rule fired during the snapshot evaluation pass.
 * `'fix'` — reserved for violations discovered during fix application (not currently used).
 */
export type AriaPhase = 'evaluate' | 'fix'

/** The immutable context snapshot passed to every rule in the evaluation pipeline. */
export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}

/** A pure function that evaluates a single ARIA policy rule against a context snapshot. */
export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => AriaResult
