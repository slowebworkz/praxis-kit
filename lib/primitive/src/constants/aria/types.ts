import type { KnownAriaRole } from './known-aria-roles'

export type AriaAttribute = string

export type AriaAttributes = ReadonlySet<AriaAttribute>

// Open union: autocompletes known role literals while still accepting any string,
// since these containers are queried with arbitrary/unknown role values at runtime.
export type AriaRoleName = KnownAriaRole | (string & {})

export type AriaRoleNames = ReadonlySet<AriaRoleName>

export type AriaAttributeRoleMap = ReadonlyMap<AriaAttribute, AriaRoleNames>
