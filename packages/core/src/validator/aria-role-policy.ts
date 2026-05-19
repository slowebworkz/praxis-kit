import type { IntrinsicTag } from '../types'

const IMPLICIT_ROLE_RECORD = {
  // Landmark elements
  article: 'article',
  aside: 'complementary',
  footer: 'contentinfo',
  header: 'banner',
  main: 'main',
  nav: 'navigation',
  // Interactive elements
  button: 'button',
  a: 'link',
  select: 'listbox',
  // Heading elements
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  // List elements
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  // Table elements
  table: 'table',
  tr: 'row',
  td: 'cell',
  th: 'columnheader',
} as const satisfies Partial<Record<IntrinsicTag, string>>

export type ImplicitRoleMap = typeof IMPLICIT_ROLE_RECORD
type Tag = keyof ImplicitRoleMap
type Role = ImplicitRoleMap[Tag]

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

const strongRoles = new Set<Role>(STRONG_ROLES)
const standaloneRoles = new Set<Role>(STANDALONE_ROLES)

export function getImplicitRole(tag: IntrinsicTag): Role | undefined {
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag as Tag]
  return undefined
}

/** Returns true if `tag` carries a strong implicit role that cannot be overridden with `role="region"`. */
export function isStrongImplicitRole(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return strongRoles.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}

/** Returns true if `tag` is a self-contained element whose implicit role makes `role="region"` invalid. */
export function isStandaloneTag(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return standaloneRoles.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}
