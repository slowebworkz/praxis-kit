import { getSelectImplicitRole } from '@praxis-kit/primitive'
import type { HtmlElementSpec } from '../types'
import { ALLOWED_SELECT_ROLES } from '../roles/select'

// `<select>`'s permitted explicit roles depend on the same `multiple`/`size` split that decides
// its implicit role, so the resolver reuses `getSelectImplicitRole`: a `listbox` result is the
// list-box form, on which ARIA-in-HTML permits no explicit `role` at all — so
// `<select multiple role="menu">` is flagged (audit finding F2). The default drop-down
// (`combobox`) form permits `menu`.
export const selectElementSpec: HtmlElementSpec<'select'> = {
  tag: 'select',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) =>
      getSelectImplicitRole(props.multiple, props.size) === 'listbox' ? [] : ALLOWED_SELECT_ROLES,
  },
}
