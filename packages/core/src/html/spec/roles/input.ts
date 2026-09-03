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
export const ALLOWED_INPUT_ROLES = {
  checkbox: ['menuitemcheckbox', 'option', 'switch', 'button'],
  radio: ['menuitemradio'],
  range: [],
  number: [],
  search: ['combobox'],
  text: ['combobox', 'searchbox', 'spinbutton'],
  email: ['combobox'],
  tel: ['combobox'],
  url: ['combobox'],
  button: [
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  submit: [
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  reset: [
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  image: [
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  hidden: [],
} as const satisfies StringMap<readonly AriaRole[]>
