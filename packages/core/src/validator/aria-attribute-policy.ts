type AriaAttributeName = string
type RoleSet = ReadonlySet<string>

// Global attributes — valid on any role, never validated for role compatibility.
const GLOBAL_ARIA_ATTRIBUTES: ReadonlySet<AriaAttributeName> = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect', // deprecated but harmless
  'aria-errormessage',
  'aria-flowto',
  'aria-grabbed', // deprecated but harmless
  'aria-hidden',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-posinset',
  'aria-relevant',
  'aria-roledescription',
  'aria-setsize',
])

// Role-restricted attributes — the curated set.
// Each entry maps an aria-* attribute to the roles that permit it.
const ROLE_RESTRICTED_ATTRIBUTES: ReadonlyMap<AriaAttributeName, RoleSet> = new Map([
  [
    'aria-checked',
    new Set(['checkbox', 'menuitemcheckbox', 'option', 'radio', 'switch', 'treeitem']),
  ],
  ['aria-pressed', new Set(['button'])],
  [
    'aria-selected',
    new Set(['columnheader', 'gridcell', 'option', 'row', 'rowheader', 'tab', 'treeitem']),
  ],
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
  [
    'aria-valuemin',
    new Set(['meter', 'progressbar', 'scrollbar', 'separator', 'slider', 'spinbutton']),
  ],
  [
    'aria-valuemax',
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
  ['aria-sort', new Set(['columnheader', 'rowheader'])],
  ['aria-multiselectable', new Set(['grid', 'listbox', 'tablist', 'tree', 'treegrid'])],
  ['aria-multiline', new Set(['textbox'])],
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
  [
    'aria-orientation',
    new Set(['scrollbar', 'select', 'separator', 'slider', 'tablist', 'toolbar', 'tree']),
  ],
])

/** Returns true when `attr` is globally valid on any role and should not be checked. */
export function isGlobalAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr)
}

/**
 * Returns true when `attr` is permitted for `role`.
 *
 * Uncurated attributes (not in `ROLE_RESTRICTED_ATTRIBUTES`) always pass — the
 * policy is opt-in, not opt-out. A restricted attribute with `role === undefined`
 * fails because there is no known role to validate against.
 */
export function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr)
  if (allowedRoles === undefined) return true
  if (role === undefined) return false
  return allowedRoles.has(role)
}
