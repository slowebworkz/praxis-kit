export const IMPLICIT_ROLE_RECORD = {
  // Landmarks
  article: 'article',
  aside: 'complementary',
  footer: 'contentinfo',
  header: 'banner',
  main: 'main',
  nav: 'navigation',
  // Interactive
  a: 'link',
  button: 'button',
  select: 'listbox',
  textarea: 'textbox',
  // Headings
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  // Lists
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  // Tables
  table: 'table',
  tr: 'row',
  td: 'cell',
  th: 'columnheader',
  // Structural / semantic
  dialog: 'dialog',
  fieldset: 'group',
  figure: 'figure',
  meter: 'meter',
  output: 'status',
  progress: 'progressbar',
} as const

// Maps input[type=...] to WAI-ARIA 1.2 role per HTML-AAM 1.0.
// Types absent from this map (e.g. color, date, hidden, file, password) have no
// corresponding ARIA role.
export const INPUT_TYPE_ROLE_MAP = {
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  text: 'textbox',
  email: 'textbox',
  tel: 'textbox',
  url: 'textbox',
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
} as const

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
