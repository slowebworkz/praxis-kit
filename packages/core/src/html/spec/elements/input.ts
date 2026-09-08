import { isNonNull, isString } from '@praxis-kit/primitive'
import type { InputAttributeName } from '../attributes/input'
import { INPUT_ATTRIBUTE_TYPE_POLICIES } from '../attributes/input'
import { INPUT_MUTUALLY_EXCLUSIVE_POLICIES } from '../constraints/input'
import { ALLOWED_INPUT_ROLES } from '../roles/input'
import type { HtmlElementSpec } from '../types'

// text-like `input[type]` values where a `list` attribute (a `<datalist>` binding) flips the
// implicit role to `combobox`. Mirrors `LIST_ELIGIBLE_INPUT_TYPES` / `getInputImplicitRole` in
// `@praxis-kit/primitive`; kept local (5 short strings) so `praxis-kit/html` does not pull the
// implicit-role guard module and its non-tree-shakeable frozen lookup tables. Both copies are
// pinned to the spec by tests and must stay in sync.
const LIST_ELIGIBLE_TYPES = new Set(['text', 'search', 'tel', 'url', 'email'])

type InputRoleKey = keyof typeof ALLOWED_INPUT_ROLES

// `input`'s roles are keyed by `type`, with `text` as the fallback for an absent or unrecognised
// `type` — HTML's own default for an omitted `type` attribute.
function rolesForType(type: string) {
  return ALLOWED_INPUT_ROLES[(type in ALLOWED_INPUT_ROLES ? type : 'text') as InputRoleKey]
}

// A `list` attribute on a text-like `type` is a *second* discriminator: it flips the implicit role
// to `combobox` (see `getInputImplicitRole`), and ARIA-in-HTML then permits no explicit `role` at
// all — `combobox` itself is redundant and handled by the redundant-role check. So
// `<input type="text" list="x" role="searchbox">` must be flagged (audit finding F2). A plain
// `byProp` table can't express "this prop is present *and* that prop is in a set", so `input`'s
// policy is `dynamic`.
// Parameterized with `InputAttributeName` so `attributes` is checked against the exact literal
// attribute-name union, not plain `string`.
export const inputElementSpec: HtmlElementSpec<'input', InputAttributeName> = {
  tag: 'input',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) => {
      const type = isString(props.type) ? props.type : 'text'
      if (isNonNull(props.list) && LIST_ELIGIBLE_TYPES.has(type)) return []
      return rolesForType(type)
    },
  },
  attributes: INPUT_ATTRIBUTE_TYPE_POLICIES,
  mutuallyExclusive: INPUT_MUTUALLY_EXCLUSIVE_POLICIES,
}
