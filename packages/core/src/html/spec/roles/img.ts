import type { AriaRole } from '../../../types'

// `<img>`'s allowed roles depend on `alt`, not just the tag — decorative images (`alt=""`) permit
// no explicit role at all, while a named/unnamed-but-present image permits this fairly large set.
// Cross-checked against "ARIA in HTML" WD, `<img>` with non-empty `alt` row (2026-09, see
// docs/accessibility/html-aria-audit.md): button, checkbox, link, math, menuitem, menuitemcheckbox,
// menuitemradio, meter, option, progressbar, radio, scrollbar, separator, slider, switch, tab,
// treeitem.
export const IMG_NAMED_ROLES: readonly AriaRole[] = [
  'button',
  'checkbox',
  'link',
  'math',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'option',
  'progressbar',
  'radio',
  'scrollbar',
  'separator',
  'slider',
  'switch',
  'tab',
  'treeitem',
]
