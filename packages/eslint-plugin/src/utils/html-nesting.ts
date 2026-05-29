// HTML5 direct-child allowlists for elements whose content model is restricted
// to a specific set of tags. Elements with open/flow content models (div, p,
// section, …) are omitted — they accept arbitrary children and need no allowlist.
//
// Source: https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
export const HTML_ALLOWED_CHILDREN: Readonly<Record<string, ReadonlySet<string>>> = {
  ul: new Set(['li', 'script', 'template']),
  ol: new Set(['li', 'script', 'template']),
  table: new Set(['caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr', 'script', 'template']),
  thead: new Set(['tr', 'script', 'template']),
  tbody: new Set(['tr', 'script', 'template']),
  tfoot: new Set(['tr', 'script', 'template']),
  tr: new Set(['td', 'th', 'script', 'template']),
  colgroup: new Set(['col', 'template']),
  dl: new Set(['dt', 'dd', 'div', 'script', 'template']),
  select: new Set(['option', 'optgroup', 'hr', 'script', 'template']),
  optgroup: new Set(['option', 'script', 'template']),
  picture: new Set(['source', 'img', 'script', 'template']),
}
