// HTML5 content categories per https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content
// Elements with transparent or context-dependent models (a, ins, del, map) are intentionally
// omitted — static category inference can't correctly model them.

export type ContentCategory =
  | 'embedded'
  | 'flow'
  | 'heading'
  | 'interactive'
  | 'metadata'
  | 'phrasing'
  | 'sectioning'

export type ContentModel =
  | { readonly kind: 'specific'; readonly allowed: ReadonlySet<string> }
  | { readonly kind: 'category'; readonly allowed: ReadonlySet<ContentCategory> }

// Per-tag category membership. Only tags that appear as children of constrained parents
// need to be listed — unconstrained parents (div, section, …) accept any flow content.
export const TAG_CATEGORIES: Readonly<Record<string, ReadonlySet<ContentCategory>>> = {
  // Phrasing + flow
  abbr: new Set<ContentCategory>(['flow', 'phrasing']),
  audio: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  b: new Set<ContentCategory>(['flow', 'phrasing']),
  bdi: new Set<ContentCategory>(['flow', 'phrasing']),
  bdo: new Set<ContentCategory>(['flow', 'phrasing']),
  br: new Set<ContentCategory>(['flow', 'phrasing']),
  button: new Set<ContentCategory>(['flow', 'phrasing', 'interactive']),
  canvas: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  cite: new Set<ContentCategory>(['flow', 'phrasing']),
  code: new Set<ContentCategory>(['flow', 'phrasing']),
  data: new Set<ContentCategory>(['flow', 'phrasing']),
  dfn: new Set<ContentCategory>(['flow', 'phrasing']),
  em: new Set<ContentCategory>(['flow', 'phrasing']),
  embed: new Set<ContentCategory>(['flow', 'phrasing', 'embedded', 'interactive']),
  i: new Set<ContentCategory>(['flow', 'phrasing']),
  iframe: new Set<ContentCategory>(['flow', 'phrasing', 'embedded', 'interactive']),
  img: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  input: new Set<ContentCategory>(['flow', 'phrasing', 'interactive']),
  kbd: new Set<ContentCategory>(['flow', 'phrasing']),
  label: new Set<ContentCategory>(['flow', 'phrasing', 'interactive']),
  mark: new Set<ContentCategory>(['flow', 'phrasing']),
  math: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  meta: new Set<ContentCategory>(['metadata', 'flow', 'phrasing']),
  noscript: new Set<ContentCategory>(['metadata', 'flow', 'phrasing']),
  object: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  output: new Set<ContentCategory>(['flow', 'phrasing']),
  picture: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  q: new Set<ContentCategory>(['flow', 'phrasing']),
  ruby: new Set<ContentCategory>(['flow', 'phrasing']),
  s: new Set<ContentCategory>(['flow', 'phrasing']),
  samp: new Set<ContentCategory>(['flow', 'phrasing']),
  script: new Set<ContentCategory>(['metadata', 'flow', 'phrasing']),
  select: new Set<ContentCategory>(['flow', 'phrasing', 'interactive']),
  small: new Set<ContentCategory>(['flow', 'phrasing']),
  span: new Set<ContentCategory>(['flow', 'phrasing']),
  strong: new Set<ContentCategory>(['flow', 'phrasing']),
  sub: new Set<ContentCategory>(['flow', 'phrasing']),
  sup: new Set<ContentCategory>(['flow', 'phrasing']),
  svg: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  template: new Set<ContentCategory>(['metadata', 'flow', 'phrasing']),
  textarea: new Set<ContentCategory>(['flow', 'phrasing', 'interactive']),
  time: new Set<ContentCategory>(['flow', 'phrasing']),
  u: new Set<ContentCategory>(['flow', 'phrasing']),
  var: new Set<ContentCategory>(['flow', 'phrasing']),
  video: new Set<ContentCategory>(['flow', 'phrasing', 'embedded']),
  wbr: new Set<ContentCategory>(['flow', 'phrasing']),

  // Flow only (block-level)
  address: new Set<ContentCategory>(['flow']),
  article: new Set<ContentCategory>(['flow', 'sectioning']),
  aside: new Set<ContentCategory>(['flow', 'sectioning']),
  blockquote: new Set<ContentCategory>(['flow']),
  details: new Set<ContentCategory>(['flow', 'interactive']),
  dialog: new Set<ContentCategory>(['flow']),
  div: new Set<ContentCategory>(['flow']),
  dl: new Set<ContentCategory>(['flow']),
  fieldset: new Set<ContentCategory>(['flow']),
  figure: new Set<ContentCategory>(['flow']),
  footer: new Set<ContentCategory>(['flow']),
  form: new Set<ContentCategory>(['flow']),
  header: new Set<ContentCategory>(['flow']),
  hr: new Set<ContentCategory>(['flow']),
  li: new Set<ContentCategory>(['flow']),
  link: new Set<ContentCategory>(['metadata', 'flow', 'phrasing']),
  main: new Set<ContentCategory>(['flow']),
  menu: new Set<ContentCategory>(['flow']),
  nav: new Set<ContentCategory>(['flow', 'sectioning']),
  ol: new Set<ContentCategory>(['flow']),
  p: new Set<ContentCategory>(['flow']),
  pre: new Set<ContentCategory>(['flow']),
  section: new Set<ContentCategory>(['flow', 'sectioning']),
  style: new Set<ContentCategory>(['metadata', 'flow']),
  summary: new Set<ContentCategory>(['flow']),
  table: new Set<ContentCategory>(['flow']),
  ul: new Set<ContentCategory>(['flow']),

  // Heading
  h1: new Set<ContentCategory>(['flow', 'heading']),
  h2: new Set<ContentCategory>(['flow', 'heading']),
  h3: new Set<ContentCategory>(['flow', 'heading']),
  h4: new Set<ContentCategory>(['flow', 'heading']),
  h5: new Set<ContentCategory>(['flow', 'heading']),
  h6: new Set<ContentCategory>(['flow', 'heading']),
  hgroup: new Set<ContentCategory>(['flow', 'heading']),

  // Metadata only
  base: new Set<ContentCategory>(['metadata']),
  title: new Set<ContentCategory>(['metadata']),
}

export const HTML_CONTENT_MODELS: Readonly<Record<string, ContentModel>> = {
  // Specific-tag constraints (structural elements whose content is enumerated, not categorical)
  colgroup: { kind: 'specific', allowed: new Set(['col', 'template']) },
  dl: { kind: 'specific', allowed: new Set(['dt', 'dd', 'div', 'script', 'template']) },
  menu: { kind: 'specific', allowed: new Set(['li', 'script', 'template']) },
  ol: { kind: 'specific', allowed: new Set(['li', 'script', 'template']) },
  optgroup: { kind: 'specific', allowed: new Set(['option', 'script', 'template']) },
  picture: { kind: 'specific', allowed: new Set(['source', 'img', 'script', 'template']) },
  select: {
    kind: 'specific',
    allowed: new Set(['option', 'optgroup', 'hr', 'script', 'template']),
  },
  table: {
    kind: 'specific',
    allowed: new Set([
      'caption',
      'colgroup',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'script',
      'template',
    ]),
  },
  tbody: { kind: 'specific', allowed: new Set(['tr', 'script', 'template']) },
  tfoot: { kind: 'specific', allowed: new Set(['tr', 'script', 'template']) },
  thead: { kind: 'specific', allowed: new Set(['tr', 'script', 'template']) },
  tr: { kind: 'specific', allowed: new Set(['td', 'th', 'script', 'template']) },
  ul: { kind: 'specific', allowed: new Set(['li', 'script', 'template']) },

  // Phrasing-content parents (any element whose content model is phrasing content)
  abbr: { kind: 'category', allowed: new Set(['phrasing']) },
  b: { kind: 'category', allowed: new Set(['phrasing']) },
  bdi: { kind: 'category', allowed: new Set(['phrasing']) },
  bdo: { kind: 'category', allowed: new Set(['phrasing']) },
  cite: { kind: 'category', allowed: new Set(['phrasing']) },
  code: { kind: 'category', allowed: new Set(['phrasing']) },
  data: { kind: 'category', allowed: new Set(['phrasing']) },
  dfn: { kind: 'category', allowed: new Set(['phrasing']) },
  dt: { kind: 'category', allowed: new Set(['phrasing']) },
  em: { kind: 'category', allowed: new Set(['phrasing']) },
  h1: { kind: 'category', allowed: new Set(['phrasing']) },
  h2: { kind: 'category', allowed: new Set(['phrasing']) },
  h3: { kind: 'category', allowed: new Set(['phrasing']) },
  h4: { kind: 'category', allowed: new Set(['phrasing']) },
  h5: { kind: 'category', allowed: new Set(['phrasing']) },
  h6: { kind: 'category', allowed: new Set(['phrasing']) },
  i: { kind: 'category', allowed: new Set(['phrasing']) },
  kbd: { kind: 'category', allowed: new Set(['phrasing']) },
  label: { kind: 'category', allowed: new Set(['phrasing']) },
  mark: { kind: 'category', allowed: new Set(['phrasing']) },
  output: { kind: 'category', allowed: new Set(['phrasing']) },
  p: { kind: 'category', allowed: new Set(['phrasing']) },
  q: { kind: 'category', allowed: new Set(['phrasing']) },
  ruby: { kind: 'category', allowed: new Set(['phrasing']) },
  s: { kind: 'category', allowed: new Set(['phrasing']) },
  samp: { kind: 'category', allowed: new Set(['phrasing']) },
  small: { kind: 'category', allowed: new Set(['phrasing']) },
  span: { kind: 'category', allowed: new Set(['phrasing']) },
  strong: { kind: 'category', allowed: new Set(['phrasing']) },
  sub: { kind: 'category', allowed: new Set(['phrasing']) },
  sup: { kind: 'category', allowed: new Set(['phrasing']) },
  time: { kind: 'category', allowed: new Set(['phrasing']) },
  u: { kind: 'category', allowed: new Set(['phrasing']) },
  var: { kind: 'category', allowed: new Set(['phrasing']) },

  // Phrasing or heading (spec allows either as first child)
  legend: { kind: 'category', allowed: new Set(['phrasing', 'heading']) },
  summary: { kind: 'category', allowed: new Set(['phrasing', 'heading']) },
}
