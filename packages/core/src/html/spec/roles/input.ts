import type { AriaRole } from '../../../types'
import type { StringMap } from '@praxis-kit/primitive'

// `<input>`'s allowed explicit `role` values depend on `type`. Keyed by the same type strings as
// `INPUT_TYPE_ROLE_MAP` (see `lib/primitive/src/constants/aria/implicit-role-record.ts`) plus
// `hidden`, which has no implicit role but is well-established as permitting no explicit role
// either (it's never in the a11y tree). Types with no entry here (color, date, datetime-local,
// month, week, time, file, password) are intentionally left unmodeled rather than guessed.
// `as const satisfies` (rather than a `Readonly<StringMap<...>>` annotation) keeps each key a
// string literal instead of widening it to `string` — required for `definePropRolePolicy`
// (spec/types.ts) to actually check its `fallback` argument against this table's real keys.
// Cross-checked against the "ARIA in HTML" WD per-input-type conformance rows (2026-09, see
// docs/accessibility/html-aria-audit.md). Lists exclude the type's own redundant implicit role.
// `combobox` on text-like types requires a `list` attribute — that case flips the *implicit*
// role to `combobox` (see `getInputImplicitRole`) and passes `roleNotPermittedRule` via its
// `role === implicitRole` early return, so it is intentionally absent from the no-`list` lists
// below (`text` keeps `combobox` because the spec permits it there without `list`).
export const ALLOWED_INPUT_ROLES = {
  checkbox: ['menuitemcheckbox', 'option', 'switch', 'button'],
  radio: ['menuitemradio'],
  range: [],
  number: [],
  search: [],
  text: ['combobox', 'searchbox', 'spinbutton'],
  email: [],
  tel: [],
  url: [],
  // button/submit/reset: checkbox, combobox, gridcell, link, menuitem, menuitemcheckbox,
  // menuitemradio, option, radio, separator, slider, switch, tab, treeitem.
  button: [
    'checkbox',
    'combobox',
    'gridcell',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'separator',
    'slider',
    'switch',
    'tab',
    'treeitem',
  ],
  submit: [
    'checkbox',
    'combobox',
    'gridcell',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'separator',
    'slider',
    'switch',
    'tab',
    'treeitem',
  ],
  reset: [
    'checkbox',
    'combobox',
    'gridcell',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'separator',
    'slider',
    'switch',
    'tab',
    'treeitem',
  ],
  // `type="image"`: same set as button/submit/reset *without* `combobox` (spec omits it here).
  image: [
    'checkbox',
    'gridcell',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'separator',
    'slider',
    'switch',
    'tab',
    'treeitem',
  ],
  hidden: [],
} as const satisfies StringMap<readonly AriaRole[]>
