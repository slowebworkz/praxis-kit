import {
  IMPLICIT_ROLE_RECORD,
  INPUT_TYPE_ROLE_MAP,
  STRONG_ROLES_SET,
  STANDALONE_ROLES_SET,
} from '../../constants/aria'

type Tag = keyof typeof IMPLICIT_ROLE_RECORD
type InputType = keyof typeof INPUT_TYPE_ROLE_MAP

export function isStrongImplicitRole(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return STRONG_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}

export function isStandaloneTag(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return STANDALONE_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}

// Returns the ARIA role implied by an input's type attribute.
// Returns undefined for types with no defined ARIA role (color, date, hidden, etc.).
export function getInputImplicitRole(type: string | undefined): string | undefined {
  if (type == null || !(type in INPUT_TYPE_ROLE_MAP)) return undefined
  return INPUT_TYPE_ROLE_MAP[type as InputType]
}

// Returns the conditional landmark role for <section> and <form>.
// Per HTML-AAM: these elements only expose a landmark role when they have an accessible name.
export function getConditionalImplicitRole(
  tag: string,
  ariaLabel: unknown,
  ariaLabelledBy: unknown,
): string | undefined {
  const isNamed = typeof ariaLabel === 'string' || typeof ariaLabelledBy === 'string'
  if (!isNamed) return undefined
  if (tag === 'section') return 'region'
  if (tag === 'form') return 'form'
  return undefined
}
