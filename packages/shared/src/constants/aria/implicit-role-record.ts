import type { IntrinsicTag } from '../../types'

export const IMPLICIT_ROLE_RECORD = {
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
type ImplicitRole = (typeof IMPLICIT_ROLE_RECORD)[Tag]

export const STRONG_ROLES = [
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
] as const satisfies readonly ImplicitRole[]

export const STANDALONE_ROLES = ['article'] as const satisfies readonly ImplicitRole[]

export const STRONG_ROLES_SET: ReadonlySet<string> = new Set(STRONG_ROLES)
export const STANDALONE_ROLES_SET: ReadonlySet<string> = new Set(STANDALONE_ROLES)
