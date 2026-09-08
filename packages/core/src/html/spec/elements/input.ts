import { LIST_ELIGIBLE_INPUT_TYPES, isNullish, isString } from '@praxis-kit/primitive'
import type { InputType } from '@praxis-kit/primitive'
import { definePropRolePolicy, resolveAllowedRoles } from '../types'
import type { HtmlElementSpec } from '../types'
import { ALLOWED_INPUT_ROLES } from '../roles/input'
import { INPUT_ATTRIBUTE_TYPE_POLICIES } from '../attributes/input'
import type { InputAttributeName } from '../attributes/input'
import { INPUT_MUTUALLY_EXCLUSIVE_POLICIES } from '../constraints/input'

// `input`'s roles are primarily keyed by `type` (an enum-like discriminator), with "text" as the
// fallback when `type` is absent or unrecognised — the same default HTML gives an omitted `type`.
// `definePropRolePolicy` requires "text" to actually be a key of `ALLOWED_INPUT_ROLES` at compile
// time, so a rename can't silently make the fallback resolve to `undefined`.
const BY_TYPE_SPEC: HtmlElementSpec = {
  tag: 'input',
  allowedRoles: definePropRolePolicy('type', ALLOWED_INPUT_ROLES, 'text'),
}

// A `list` attribute on a text-like `type` is a *second* discriminator: it flips the implicit role
// to `combobox` (see `getInputImplicitRole`), and ARIA-in-HTML then permits no explicit `role` at
// all — `combobox` itself is redundant and handled by the redundant-role check. So
// `<input type="text" list="x" role="searchbox">` must be flagged (audit finding F2). A plain
// `byProp` table can't express "this prop is present *and* that prop is in a set", so `input`'s
// policy is `dynamic`, delegating to the `type` table for every non-`list` case.
// Parameterized with `InputAttributeName` so `attributes` is checked against the exact literal
// attribute-name union, not plain `string`.
export const inputElementSpec: HtmlElementSpec<'input', InputAttributeName> = {
  tag: 'input',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) => {
      const type = isString(props.type) ? props.type : 'text'
      if (!isNullish(props.list) && LIST_ELIGIBLE_INPUT_TYPES.has(type as InputType)) return []
      return resolveAllowedRoles(BY_TYPE_SPEC, props) ?? []
    },
  },
  attributes: INPUT_ATTRIBUTE_TYPE_POLICIES,
  mutuallyExclusive: INPUT_MUTUALLY_EXCLUSIVE_POLICIES,
}
