import type { IntrinsicTag } from '../types'

type Registry = readonly (readonly [PropertyKey, unknown])[]
type ImplicitRoleTuple<T extends Registry> = T[number]
type ImplicitTag<T extends Registry> = ImplicitRoleTuple<T>[0]
type ImplicitRole<T extends Registry> = ImplicitRoleTuple<T>[1]

const IMPLICIT_ROLES = [
  ['article', 'article'],
  ['aside', 'complementary'],
  ['footer', 'contentinfo'],
  ['header', 'banner'],
  ['main', 'main'],
  ['nav', 'navigation'],
] as const

type Roles = typeof IMPLICIT_ROLES
type Tag = ImplicitTag<Roles>
type Role = ImplicitRole<Roles>

// STRONG_ROLES: landmark roles whose semantics resist role="region" override — replacing them
// would silently degrade landmark navigation for assistive technology users.
const STRONG_ROLES = [
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
] as const satisfies readonly Role[]

// STANDALONE_ROLES: self-contained elements where role="region" is structurally incorrect
// regardless of implicit-role strength (e.g. <article> is already its own AT landmark).
const STANDALONE_ROLES = ['article'] as const satisfies readonly Role[]

const implicitRoles = new Map<Tag, Role>(IMPLICIT_ROLES)

const strongRoles = new Set<Role>(STRONG_ROLES)

const standaloneRoles = new Set<Role>(STANDALONE_ROLES)

export function getImplicitRole(tag: IntrinsicTag): Role | undefined {
  return implicitRoles.get(tag as Tag)
}

/** Returns true if `tag` carries a strong implicit role that cannot be overridden with `role="region"`. */
export function isStrongImplicitRole(tag: string): boolean {
  const role = implicitRoles.get(tag as Tag)
  return role !== undefined && strongRoles.has(role)
}

/** Returns true if `tag` is a self-contained element whose implicit role makes `role="region"` invalid. */
export function isStandaloneTag(tag: string): boolean {
  const role = implicitRoles.get(tag as Tag)
  return role !== undefined && standaloneRoles.has(role)
}
