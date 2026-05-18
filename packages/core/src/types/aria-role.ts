import type { KNOWN_ARIA_ROLES } from '../validator'

/** One of the curated WAI-ARIA roles explicitly recognised by this library. */
export type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number]

/**
 * A valid WAI-ARIA role. Known landmark and common roles are listed as
 * literals for IDE autocomplete; `string & {}` admits any other role
 * without collapsing the union to plain `string`.
 */
export type AriaRole = KnownAriaRole | (string & {})
