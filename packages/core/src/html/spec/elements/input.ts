import type { HtmlElementSpec } from '../types'
import { ALLOWED_INPUT_ROLES } from '../roles/input'
import { INPUT_ATTRIBUTE_TYPE_POLICIES } from '../attributes/input'
import { INPUT_MUTUALLY_EXCLUSIVE_POLICIES } from '../constraints/input'

// `input`'s roles are keyed by `type` (an enum-like discriminator), with "text" as the fallback
// when `type` is absent — the same default the HTML spec gives an omitted `type` attribute.
export const inputElementSpec: HtmlElementSpec = {
  tag: 'input',
  allowedRoles: { kind: 'byProp', prop: 'type', map: ALLOWED_INPUT_ROLES, fallback: 'text' },
  attributes: INPUT_ATTRIBUTE_TYPE_POLICIES,
  mutuallyExclusive: INPUT_MUTUALLY_EXCLUSIVE_POLICIES,
}
