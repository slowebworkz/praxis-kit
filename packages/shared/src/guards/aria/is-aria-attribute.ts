type AriaAttributeName = string
type RoleSet = ReadonlySet<string>

// WAI-ARIA 1.2 §6.6.6 — states and properties inherited by all roles.
// aria-dropeffect and aria-grabbed are omitted (deprecated since ARIA 1.1).
const GLOBAL_ARIA_ATTRIBUTES: ReadonlySet<AriaAttributeName> = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-errormessage',
  'aria-flowto',
  'aria-hidden',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-relevant',
  'aria-roledescription',
])

// WAI-ARIA 1.2 — states and properties scoped to specific roles.
// Attributes absent from this map (and not global) are accepted unconditionally
// because unknown aria-* attributes may be valid per a future spec revision or
// a custom role not yet covered here.
const ROLE_RESTRICTED_ATTRIBUTES: ReadonlyMap<AriaAttributeName, RoleSet> = new Map([
  [
    'aria-activedescendant',
    new Set([
      'application',
      'combobox',
      'grid',
      'group',
      'listbox',
      'menu',
      'menubar',
      'radiogroup',
      'spinbutton',
      'tablist',
      'toolbar',
      'textbox',
      'tree',
      'treegrid',
    ]),
  ],
  ['aria-autocomplete', new Set(['combobox', 'searchbox', 'textbox'])],
  [
    'aria-checked',
    new Set(['checkbox', 'menuitemcheckbox', 'option', 'radio', 'switch', 'treeitem']),
  ],
  ['aria-colcount', new Set(['grid', 'table', 'treegrid'])],
  ['aria-colindex', new Set(['cell', 'columnheader', 'gridcell', 'row', 'rowheader'])],
  ['aria-colspan', new Set(['cell', 'columnheader', 'gridcell', 'rowheader'])],
  [
    'aria-expanded',
    new Set([
      'button',
      'combobox',
      'gridcell',
      'listbox',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'row',
      'rowheader',
      'tab',
      'treeitem',
    ]),
  ],
  [
    'aria-haspopup',
    new Set([
      'button',
      'combobox',
      'gridcell',
      'listbox',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'tab',
      'treeitem',
    ]),
  ],
  ['aria-level', new Set(['heading', 'listitem', 'row', 'treeitem'])],
  ['aria-modal', new Set(['alertdialog', 'dialog'])],
  ['aria-multiline', new Set(['textbox'])],
  ['aria-multiselectable', new Set(['grid', 'listbox', 'tablist', 'tree', 'treegrid'])],
  [
    'aria-orientation',
    new Set(['scrollbar', 'select', 'separator', 'slider', 'tablist', 'toolbar', 'tree']),
  ],
  ['aria-placeholder', new Set(['searchbox', 'textbox'])],
  [
    'aria-posinset',
    new Set([
      'article',
      'listitem',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'option',
      'radio',
      'row',
      'tab',
    ]),
  ],
  ['aria-pressed', new Set(['button'])],
  [
    'aria-readonly',
    new Set([
      'combobox',
      'grid',
      'gridcell',
      'listbox',
      'radiogroup',
      'slider',
      'spinbutton',
      'textbox',
      'tree',
      'treegrid',
    ]),
  ],
  [
    'aria-required',
    new Set([
      'combobox',
      'gridcell',
      'listbox',
      'radiogroup',
      'spinbutton',
      'textbox',
      'tree',
      'treegrid',
    ]),
  ],
  ['aria-rowcount', new Set(['grid', 'table', 'treegrid'])],
  ['aria-rowindex', new Set(['cell', 'columnheader', 'gridcell', 'row', 'rowheader'])],
  ['aria-rowspan', new Set(['cell', 'columnheader', 'gridcell', 'rowheader'])],
  [
    'aria-selected',
    new Set(['columnheader', 'gridcell', 'option', 'row', 'rowheader', 'tab', 'treeitem']),
  ],
  [
    'aria-setsize',
    new Set([
      'article',
      'listitem',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'option',
      'radio',
      'row',
      'tab',
    ]),
  ],
  ['aria-sort', new Set(['columnheader', 'rowheader'])],
  [
    'aria-valuemax',
    new Set(['meter', 'progressbar', 'scrollbar', 'separator', 'slider', 'spinbutton']),
  ],
  [
    'aria-valuemin',
    new Set(['meter', 'progressbar', 'scrollbar', 'separator', 'slider', 'spinbutton']),
  ],
  [
    'aria-valuenow',
    new Set(['meter', 'progressbar', 'scrollbar', 'separator', 'slider', 'spinbutton']),
  ],
  [
    'aria-valuetext',
    new Set(['meter', 'progressbar', 'scrollbar', 'separator', 'slider', 'spinbutton']),
  ],
])

export function isGlobalAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr)
}

export function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr)
  if (allowedRoles === undefined) return true
  if (role === undefined) return false
  return allowedRoles.has(role)
}
