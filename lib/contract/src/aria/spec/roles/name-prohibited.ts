// WAI-ARIA 1.2 — roles that are "Name Prohibited": they do not support a name from the author,
// so `aria-label` / `aria-labelledby` on them is a conformance error (§5.2.8.6, "Roles which
// cannot be named"). `aria-label`/`aria-labelledby` are otherwise global, which is why this is
// modelled as an explicit prohibition list rather than an absence from a support table.
//
// Source list (WAI-ARIA 1.2 §5.2.8.6): caption, code, deletion, emphasis, generic, insertion,
// paragraph, presentation, strong, subscript, superscript. `none` is the synonym of
// `presentation`. The inline text-level roles here match `role="doc-*"`-free reading order —
// naming a `<strong>` or a bare `<a>` (implicit `generic`) with `aria-label` silently does
// nothing in every screen reader.
//
// `presentation` / `none` are kept in the set so it is a faithful copy of the spec's own list,
// but `#checkNameProhibitedRoles` skips them: `#checkPresentationalAriaAttributes` already strips
// *every* non-`aria-hidden` aria-* on a presentational element, so reporting `aria-label` there
// twice would be noise.
export const NAME_PROHIBITED_ROLES: ReadonlySet<string> = new Set([
  'caption',
  'code',
  'deletion',
  'emphasis',
  'generic',
  'insertion',
  'none',
  'paragraph',
  'presentation',
  'strong',
  'subscript',
  'superscript',
])

export const NAME_PROHIBITED_ATTRIBUTES = ['aria-label', 'aria-labelledby'] as const
