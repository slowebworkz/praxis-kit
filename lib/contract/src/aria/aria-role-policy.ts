import type { IntrinsicTag } from '@praxis-kit/shared/types'
import { isStandaloneTag, isStrongImplicitRole } from '@praxis-kit/shared/guards/aria'

export { isStandaloneTag, isStrongImplicitRole }

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

export type ImplicitRoleMap = typeof IMPLICIT_ROLE_RECORD
type Tag = keyof ImplicitRoleMap
type Role = ImplicitRoleMap[Tag]

export function getImplicitRole(tag: IntrinsicTag): Role | undefined {
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag as Tag]
  return undefined
}
