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
 * regardless of how many rules emitted it. Per-attribute removals use the
 * namespaced form `'removeAttribute:aria-checked'` etc., giving each attribute
 * its own deduplication slot without any structural change to the Map.
 */
export type RemoveAttributeFixKind = `removeAttribute:${string}`
export type FixKind = 'removeRole' | 'setRole' | RemoveAttributeFixKind

/**
 * A self-contained fix action emitted by an ARIA rule when `fixable: true`.
 *
 * `kind` is used to deduplicate fixes across rules. `apply` receives the current
 * props snapshot and returns an `AriaFixResult` indicating whether it mutated anything.
 *
 * `priority` controls ordering when multiple fixes coexist (lower = runs first).
 * `source` records which rule pack or plugin produced the fix — useful for conflict resolution.
 */
export type AriaFix = {
  readonly kind: FixKind
  readonly priority?: number
  readonly source?: string
  readonly apply: (context: AriaContext) => AriaFixResult
}

export type ValidResult = { valid: true }

export type Severity = 'error' | 'warning' | (string & {})

type InvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message: M
  attribute?: string
}

/**
 * An invalid rule result that carries an auto-fix.
 * The fix is deduplicated by `kind` before the fix phase runs.
 */
export type InvalidWithFix<M extends string = string> = InvalidBase<M> & {
  fixable: true
  fix: AriaFix
}

/** An invalid rule result with no available auto-fix. */
export type InvalidWithoutFix<M extends string = string> = InvalidBase<M> & {
  fixable: false
}

/** Discriminated union returned by every `AriaRule`. */
export type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>

/** The full return type of an `AriaRule` — valid or invalid (with or without a fix). */
export type AriaResult = ValidResult | InvalidResult

/**
 * Identifies which phase of the engine produced a `ValidationViolation`.
 *
 * `'evaluate'` — the rule fired during the snapshot evaluation pass.
 * `'fix'` — reserved for violations discovered during fix application (not currently used).
 */
export type AriaPhase = 'evaluate' | 'fix'

/**
 * The immutable context snapshot passed to every rule in the evaluation pipeline.
 *
 * `effectiveRole` is the role the element is acting as: the explicit `props.role` when
 * present, otherwise `implicitRole`. Attribute rules use this to check whether a given
 * `aria-*` prop is permitted for the element's actual role without re-deriving it.
 */
export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly effectiveRole: string | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}

/** A pure function that evaluates a single ARIA policy rule against a context snapshot. */
export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => readonly AriaResult[]
