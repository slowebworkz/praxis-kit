import type { ChildrenEvaluator, EmptyRecord } from '@praxis-kit/core'
import type { WithChildRules } from '@praxis-kit/primitive'

/**
 * Matches option types for which `buildEngines` constructs a {@link ChildrenEvaluator}. That
 * happens for **any** of three knobs, so this mirrors all three rather than just child rules:
 *
 * - `enforcement.children` — a non-empty rule array
 * - `enforcement.exclusiveChildren: true` — closed children, even with no rules
 * - `enforcement.allowText: false` — text children rejected, even with no rules
 *
 * The last two only match when the option type carries the literal `true` / `false` (an author
 * writing `exclusiveChildren: true` in a `const`-inferred options object); a widened `boolean`
 * that happens to be `true` at runtime is an unavoidable gap between a value check and a type.
 */
type WithChildrenEnforcement =
  | { enforcement: { children: readonly unknown[] } }
  | { enforcement: { exclusiveChildren: true } }
  | { enforcement: { allowText: false } }

/**
 * The bundle of child evaluation services produced when
 * child enforcement rules are configured.
 */
type ChildrenEvaluatorBundle = { childrenEvaluator: ChildrenEvaluator }

/**
 * Conditionally includes a {@link ChildrenEvaluator} in the
 * built bundle when child enforcement rules are present.
 *
 * When no child enforcement rules are configured, this type
 * resolves to {@link EmptyRecord}, omitting the property
 * entirely rather than making it optional. Consumers can
 * safely narrow using:
 *
 * ```ts
 * if ('childrenEvaluator' in bundle) {
 *   // bundle.childrenEvaluator is available
 * }
 * ```
 *
 * @typeParam TOptions - The component configuration options.
 */
export type BuiltChildrenEvaluator<TOptions extends WithChildRules> =
  TOptions extends WithChildrenEnforcement ? ChildrenEvaluatorBundle : EmptyRecord
