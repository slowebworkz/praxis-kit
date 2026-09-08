import { isNonNull, isNumber, isString } from '@praxis-kit/primitive'
import type { HtmlElementSpec } from '../types'
import { ALLOWED_SELECT_ROLES } from '../roles/select'

// A `<select>` is a list box when it has a `multiple` attribute in any boolean-attr-truthy form
// (present, `""`, `"multiple"` — but not the JSX shorthand `multiple={false}` / `"false"`) or a
// `size` greater than 1; otherwise it is the default drop-down. Mirrors `getSelectImplicitRole` in
// `@praxis-kit/primitive`, kept local so `praxis-kit/html` does not pull the implicit-role guard
// module and its (non-tree-shakeable) frozen lookup tables to resolve one allowed-role set.
function isListBoxSelect(props: Readonly<Record<string, unknown>>): boolean {
  const { multiple, size } = props
  const multipleOn =
    isNonNull(multiple) &&
    multiple !== false &&
    (!isString(multiple) || multiple.toLowerCase() !== 'false')
  if (multipleOn) return true
  const parsed = isNumber(size) ? size : isString(size) ? Number(size) : Number.NaN
  return Number.isFinite(parsed) && parsed > 1
}

// `<select>`'s permitted explicit roles depend on its form: the list-box form permits no explicit
// `role` at all — so `<select multiple role="menu">` is flagged (audit finding F2) — while the
// default drop-down permits `menu`. A `byProp` table can't express the `multiple`/`size` split,
// so this is a `dynamic` policy.
export const selectElementSpec: HtmlElementSpec<'select'> = {
  tag: 'select',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) => (isListBoxSelect(props) ? [] : ALLOWED_SELECT_ROLES),
  },
}
