export const KNOWN_ARIA_ROLES = [
  'alert',
  'alertdialog',
  'article',
  'banner',
  'button',
  'complementary',
  'contentinfo',
  'dialog',
  'form',
  'main',
  'navigation',
  'region',
  'search',
] as const

/** One of the curated WAI-ARIA roles explicitly recognised by this library. */
export type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number]

/**
 * A valid WAI-ARIA role. Known landmark and common roles are listed as
 * literals for IDE autocomplete; `string & {}` admits any other role
 * without collapsing the union to plain `string`.
 */
export type AriaRole = KnownAriaRole | (string & {})

const KNOWN_ARIA_ROLES_SET: ReadonlySet<string> = new Set(KNOWN_ARIA_ROLES)

export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return typeof value === 'string' && KNOWN_ARIA_ROLES_SET.has(value)
}

export function hasRole(props: { role?: unknown }): props is { role: string } {
  return typeof props.role === 'string'
}
