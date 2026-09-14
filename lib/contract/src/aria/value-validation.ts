/**
 * ARIA attribute value type system: what counts as a valid value for a given
 * {@link AriaValueType}, and how to describe what was expected when it isn't. Extracted from
 * `AriaPolicyEngine` — these three functions are cohesive on their own (they're describing a
 * type system, not policy), and `#checkAriaAttributeValues` (kept in `aria-policy-engine.ts`
 * alongside every other rule implementation — see that file's own pipeline) is now just a thin
 * caller of {@link isValidAriaValue}/{@link describeExpected}.
 */
import { isDefined, isNumber, isString, isUndefined } from '@praxis-kit/primitive'
import type { AriaValueType } from '../types'

/**
 * Strict numeric coercion for ARIA attribute values. Unlike `parseFloat`/`parseInt`, the whole
 * string must be a number — `"12abc"` is rejected, not read as `12` — and an empty / whitespace
 * string is rejected rather than coerced to `0` the way `Number("")` would.
 *
 * Exported (not local to `isValidAriaValue`) because `AriaPolicyEngine.#checkRedundantAriaLevel`
 * also needs it, independent of the general ARIA value-type check this module otherwise exists
 * for — `aria-level`'s "redundant" check is about comparing a numeric attribute value to a
 * known implicit level, not about validating the value's type.
 */
export function strictNumeric(value: unknown): number | undefined {
  if (isNumber(value)) return Number.isFinite(value) ? value : undefined
  if (!isString(value)) return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** Returns whether `value` satisfies `type`'s own value-type constraint (boolean/tristate/
 *  number/integer/enum) — the WAI-ARIA attribute value type system, independent of which
 *  attribute or role it's being checked for. */
export function isValidAriaValue(value: unknown, type: AriaValueType): boolean {
  switch (type.kind) {
    case 'boolean':
      return value === 'true' || value === 'false' || value === true || value === false
    case 'tristate':
      return (
        value === 'true' ||
        value === 'false' ||
        value === 'mixed' ||
        value === true ||
        value === false
      )
    case 'number':
      return strictNumeric(value) !== undefined
    case 'integer': {
      const n = strictNumeric(value)
      if (isUndefined(n) || !Number.isInteger(n)) return false
      if (isDefined(type.min) && n < type.min) return false
      if (isDefined(type.max) && n > type.max) return false
      return true
    }
    case 'enum':
      return isString(value) && type.values.has(value)
  }
}

/** Describes what a valid value for `type` looks like, for use in an invalid-value diagnostic
 *  message (e.g. `aria-valuenow` got `"abc"`, expected "a finite number"). */
export function describeExpected(type: AriaValueType): string {
  switch (type.kind) {
    case 'boolean':
      return '"true" or "false"'
    case 'tristate':
      return '"true", "false", or "mixed"'
    case 'number':
      return 'a finite number'
    case 'integer': {
      const parts: string[] = ['an integer']
      if (isDefined(type.min) && isDefined(type.max))
        parts.push(`between ${type.min} and ${type.max}`)
      else if (isDefined(type.min)) parts.push(`≥ ${type.min}`)
      else if (isDefined(type.max)) parts.push(`≤ ${type.max}`)
      return parts.join(' ')
    }
    case 'enum':
      return [...type.values].map((v) => `"${v}"`).join(', ')
  }
}
