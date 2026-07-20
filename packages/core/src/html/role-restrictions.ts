import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../types'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import { ALLOWED_INPUT_ROLES } from './spec/roles/input'
import { IMG_NAMED_ROLES } from './spec/roles/img'
import { ALLOWED_TABLE_ROLES } from './spec/roles/table'

// The WAI-ARIA "ARIA in HTML" recommendation restricts which explicit `role` values a native
// element may take, beyond its own implicit role. `undefined` here means "not modeled" — either
// the element's allowed roles are context-dependent in a way a single-element `AriaContext` can't
// see (e.g. <td> becomes a valid `gridcell` only inside a `role="grid"` ancestor, which this
// tag-and-props-only context has no visibility into), or the allowed set isn't settled enough to
// enforce confidently. `[]` means the opposite extreme: no explicit role is permitted at all.
// This table should be cross-checked against the current W3C ARIA-in-HTML spec before being
// treated as exhaustive — it was authored from well-established fragments of that spec, not
// generated from it mechanically.
const ALLOWED_ROLES: Readonly<Record<string, readonly string[]>> = {
  article: ['application', 'document', 'feed', 'main', 'none', 'presentation', 'region'],
  aside: ['feed', 'none', 'presentation', 'region', 'search'],
  footer: ['group', 'none', 'presentation'],
  header: ['group', 'none', 'presentation'],
  main: [],
  nav: [],
  a: [
    'button',
    'checkbox',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
    'treeitem',
  ],
  button: [
    'checkbox',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  select: ['menu'],
  h1: ['tab', 'presentation', 'none'],
  h2: ['tab', 'presentation', 'none'],
  h3: ['tab', 'presentation', 'none'],
  h4: ['tab', 'presentation', 'none'],
  h5: ['tab', 'presentation', 'none'],
  h6: ['tab', 'presentation', 'none'],
  ul: [
    'directory',
    'group',
    'listbox',
    'menu',
    'menubar',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  ol: [
    'directory',
    'group',
    'listbox',
    'menu',
    'menubar',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  li: [
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'none',
    'presentation',
    'radio',
    'separator',
    'tab',
    'treeitem',
  ],
  dialog: ['alertdialog'],
  fieldset: ['none', 'presentation', 'radiogroup'],
}

function getAllowedRoles(
  tag: string,
  props: Readonly<Record<string, unknown>>,
): readonly string[] | undefined {
  if (tag === 'input') {
    const type = typeof props.type === 'string' ? props.type : 'text'
    return ALLOWED_INPUT_ROLES[type]
  }
  if (tag === 'img') {
    return props.alt === '' ? [] : IMG_NAMED_ROLES
  }
  if (tag === 'table') {
    return ALLOWED_TABLE_ROLES
  }
  return ALLOWED_ROLES[tag]
}

const removeRoleFix: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _role, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

// Warn when an explicit `role` is neither the element's implicit role (that's the generic
// redundant-role check's job) nor one of its documented alternates.
export const roleNotPermittedRule: AriaRule = Object.assign(
  ({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] => {
    const role = props.role
    if (typeof role !== 'string' || role.length === 0 || role === implicitRole) return []
    const allowed = getAllowedRoles(tag, props)
    if (allowed === undefined || allowed.includes(role)) return []
    const diagnostic = HtmlDiagnostics.roleNotPermitted(tag, role, allowed)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeRoleFix,
        diagnostic,
      },
    ]
  },
  { readsProps: ['role', 'type', 'alt'] as const },
)
