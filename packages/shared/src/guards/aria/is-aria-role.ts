import type { IntrinsicTag } from '../../types'

const IMPLICIT_ROLE_RECORD = {
  article: 'article',
  aside: 'complementary',
  footer: 'contentinfo',
  header: 'banner',
  main: 'main',
  nav: 'navigation',
  button: 'button',
  a: 'link',
  select: 'listbox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  table: 'table',
  tr: 'row',
  td: 'cell',
  th: 'columnheader',
} as const satisfies Partial<Record<IntrinsicTag, string>>

type Tag = keyof typeof IMPLICIT_ROLE_RECORD
type Role = (typeof IMPLICIT_ROLE_RECORD)[Tag]

const STRONG_ROLES = [
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
] as const satisfies readonly Role[]
const STANDALONE_ROLES = ['article'] as const satisfies readonly Role[]

const strongRoles = new Set<Role>(STRONG_ROLES)
const standaloneRoles = new Set<Role>(STANDALONE_ROLES)

export function isStrongImplicitRole(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return strongRoles.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}

export function isStandaloneTag(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return standaloneRoles.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}
