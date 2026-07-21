import { definePropRolePolicy, type HtmlElementSpec } from '../types'
import { ALLOWED_INPUT_ROLES } from '../roles/input'
import { INPUT_ATTRIBUTE_TYPE_POLICIES, type InputAttributeName } from '../attributes/input'
import { INPUT_MUTUALLY_EXCLUSIVE_POLICIES } from '../constraints/input'

// `input`'s roles are keyed by `type` (an enum-like discriminator), with "text" as the fallback
// when `type` is absent — the same default the HTML spec gives an omitted `type` attribute.
// `definePropRolePolicy` requires "text" to actually be a key of `ALLOWED_INPUT_ROLES` at compile
// time, rather than silently resolving to `undefined` if it were ever renamed away.
// Parameterized with `InputAttributeName` so `attributes` is checked against the exact literal
// attribute-name union, not plain `string`.
export const inputElementSpec: HtmlElementSpec<'input', InputAttributeName, string, 'type'> = {
  tag: 'input',
  allowedRoles: definePropRolePolicy('type', ALLOWED_INPUT_ROLES, 'text'),
  attributes: INPUT_ATTRIBUTE_TYPE_POLICIES,
  mutuallyExclusive: INPUT_MUTUALLY_EXCLUSIVE_POLICIES,
}
