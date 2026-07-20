// `<img>`'s allowed roles depend on `alt`, not just the tag — decorative images (`alt=""`) permit
// no explicit role at all, while a named/unnamed-but-present image permits this fairly large set.
export const IMG_NAMED_ROLES: readonly string[] = [
  'button',
  'checkbox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'progressbar',
  'scrollbar',
  'separator',
  'slider',
  'switch',
  'tab',
  'treeitem',
]
