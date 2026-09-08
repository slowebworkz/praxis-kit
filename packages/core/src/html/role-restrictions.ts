import type { AriaContext, AriaFix, AriaResult, AriaRole, AriaRule } from '../types'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import type { StringMap } from '@praxis-kit/primitive'
import type { HtmlElementSpec } from './spec/types'
import { resolveAllowedRoles } from './spec/types'
import { inputElementSpec } from './spec/elements/input'
import { imgElementSpec } from './spec/elements/img'
import { selectElementSpec } from './spec/elements/select'
import { tableElementSpec } from './spec/elements/table'

// The WAI-ARIA "ARIA in HTML" recommendation restricts which explicit `role` values a native
// element may take, beyond its own implicit role. `undefined` here means "not modeled" — either
// the element's allowed roles are context-dependent in a way a single-element `AriaContext` can't
// see (e.g. <td> becomes a valid `gridcell` only inside a `role="grid"` ancestor, which this
// tag-and-props-only context has no visibility into), or the allowed set isn't settled enough to
// enforce confidently. `[]` means the opposite extreme: no explicit role is permitted at all.
// Cross-checked against the W3C "ARIA in HTML" WD conformance table (2026-09, see
// docs/accessibility/html-aria-audit.md). Entries carry a `// ARIA-in-HTML <tag>: …` comment quoting the
// spec's allowed-roles cell; entries that deliberately diverge are marked `DELIBERATE POLICY`.
// Still not modelled here (context-dependent, needs sibling/ancestor visibility a single-element
// AriaContext lacks): `dl`/`dt`/`dd`, `section`, `figure` (figcaption-conditional), table cells.
const ALLOWED_ROLES: Readonly<StringMap<readonly AriaRole[]>> = {
  article: ['application', 'document', 'feed', 'main', 'none', 'presentation', 'region'],
  // ARIA-in-HTML <aside>: feed, none, note, presentation, region, search.
  aside: ['feed', 'none', 'note', 'presentation', 'region', 'search'],
  footer: ['group', 'none', 'presentation'],
  header: ['group', 'none', 'presentation'],
  main: [],
  // ARIA-in-HTML <nav>: menu, menubar, none, presentation, tablist. `landmarkRoleRule` still
  // advises against overriding the navigation landmark (deliberate Praxis policy) — this list
  // only stops `roleNotPermittedRule` from *also* flagging the spec-permitted alternates.
  nav: ['menu', 'menubar', 'none', 'presentation', 'tablist'],
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
  // ARIA-in-HTML <button>: checkbox, combobox, gridcell, link, menuitem, menuitemcheckbox,
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
  h1: ['tab', 'presentation', 'none'],
  h2: ['tab', 'presentation', 'none'],
  h3: ['tab', 'presentation', 'none'],
  h4: ['tab', 'presentation', 'none'],
  h5: ['tab', 'presentation', 'none'],
  h6: ['tab', 'presentation', 'none'],
  // ARIA-in-HTML <ul>/<ol>: group, listbox, menu, menubar, none, presentation, radiogroup,
  // tablist, toolbar, tree. (`directory` was dropped — it is deprecated in WAI-ARIA 1.2 and
  // maps to `list`.)
  ul: [
    'group',
    'listbox',
    'menu',
    'menubar',
    'none',
    'presentation',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  ol: [
    'group',
    'listbox',
    'menu',
    'menubar',
    'none',
    'presentation',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  // DELIBERATE POLICY (wider than current spec): current ARIA-in-HTML narrowed <li>-in-a-list to
  // "no role other than listitem", but the APG tree / menu / menubar / tablist patterns are all
  // built on `<li role="treeitem|menuitem|tab">`. Enforcing the spec text literally would flag
  // those reference patterns. Revisit if ARIA-in-HTML restores an explicit list.
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
  // `<label>` has no implicit role and no documented alternates — its native labeling
  // semantics (control association, accessible-name contribution) aren't reproducible via
  // ARIA, so any explicit `role` should be avoided rather than substituted.
  label: [],
}

// Tags whose allowed-roles fact is expressed as a spec/elements/*.ts `HtmlElementSpec` rather
// than a flat entry in `ALLOWED_ROLES` — currently the ones with prop-conditional or non-trivial
// policies. Tags not in this map fall back to the plain `ALLOWED_ROLES` lookup.
const ELEMENT_SPECS: Readonly<StringMap<HtmlElementSpec>> = {
  input: inputElementSpec,
  img: imgElementSpec,
  select: selectElementSpec,
  table: tableElementSpec,
}

function getAllowedRoles(
  tag: string,
  props: Readonly<StringMap<unknown>>,
): readonly AriaRole[] | undefined {
  const spec = ELEMENT_SPECS[tag]
  if (spec) return resolveAllowedRoles(spec, props)
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
  { readsProps: ['role', 'type', 'alt', 'list', 'multiple', 'size'] as const },
)
