import {
  IMPLICIT_ROLE_RECORD,
  INPUT_TYPE_ROLE_MAP,
  STRONG_ROLES_SET,
  STANDALONE_ROLES_SET,
} from '../../constants'
import type { InputType, Tag } from '../../constants'
import { isNullish, isString } from '../foundational'

function lookupImplicitRole(tag: string): string | undefined {
  return IMPLICIT_ROLE_RECORD[tag as Tag]
}

/**
 * Returns whether the element has a strong implicit ARIA role.
 *
 * Strong implicit roles cannot be overridden with an explicit `role`
 * attribute unless the HTML specification explicitly permits it.
 */
export function isStrongImplicitRole(tag: string): boolean {
  const role = lookupImplicitRole(tag)
  return !isNullish(role) && STRONG_ROLES_SET.has(role)
}

/**
 * Returns whether the element's implicit ARIA role is considered
 * standalone for accessibility validation purposes.
 */
export function hasStandaloneRole(tag: string): boolean {
  const role = lookupImplicitRole(tag)
  return !isNullish(role) && STANDALONE_ROLES_SET.has(role)
}

/**
 * Input types for which the presence of a `list` attribute changes the
 * implicit ARIA role from `textbox` to `combobox`, as defined by the
 * ARIA-in-HTML specification.
 */
const LIST_ELIGIBLE_INPUT_TYPES = new Set<InputType>(['text', 'search', 'tel', 'url', 'email'])

/**
 * Returns the implicit ARIA role for an `<input>` element.
 *
 * For text-like input types associated with a `<datalist>` via the
 * `list` attribute, the implicit role becomes `combobox` instead of
 * `textbox`, per the ARIA-in-HTML specification.
 *
 * Returns `undefined` for input types that do not expose an implicit
 * ARIA role (for example `color`, `date`, or `hidden`).
 */
export function getInputImplicitRole(type: unknown, list?: unknown): string | undefined {
  if (!isString(type)) return undefined

  const role = INPUT_TYPE_ROLE_MAP[type as keyof typeof INPUT_TYPE_ROLE_MAP]
  if (!role) return undefined

  if (!isNullish(list) && LIST_ELIGIBLE_INPUT_TYPES.has(type as InputType)) {
    return 'combobox'
  }

  return role
}

/**
 * Returns the conditional implicit landmark role for `<section>` and
 * `<form>` elements.
 *
 * Per HTML-AAM, these elements expose their landmark roles only when
 * they have an accessible name provided by `aria-label` or
 * `aria-labelledby`.
 */
export function getConditionalImplicitRole(
  tag: string,
  ariaLabel: unknown,
  ariaLabelledBy: unknown,
): string | undefined {
  const isNamed =
    (isString(ariaLabel) && ariaLabel.trim().length > 0) ||
    (isString(ariaLabelledBy) && ariaLabelledBy.trim().length > 0)

  if (!isNamed) return undefined
  if (tag === 'section') return 'region'
  if (tag === 'form') return 'form'

  return undefined
}
