import type { AnyRecord } from '@praxis-kit/primitive'

// Source: HTML — the "focusable area" / tabindex rules, and the disabled/hidden exclusions from
// the focusable-area definition.
//
// `NATIVE_INTERACTIVE_TAGS` (a bare tag set) can't answer this on its own: a `<a>`/`<area>` is
// not a focusable area without `href`, `<input type="hidden">` is not focusable, a `disabled`
// form control is removed from the tab order, and any element becomes focusable with
// `tabindex="0"` or `contenteditable`. This resolves the prop-dependent cases.

function parseTabIndex(raw: unknown): number | undefined {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : undefined
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isInteger(n) ? n : undefined
}

// `disabled` is an HTML boolean attribute: presence means true regardless of value, so
// `disabled=""` / `disabled="false"` / `disabled` all count — only an absent or explicitly
// `false`/`null` (JSX not-rendered) value is "not disabled". This is HTML semantics, not JS
// truthiness.
function isDisabled(props: Readonly<AnyRecord>): boolean {
  const d = props['disabled']
  return d !== undefined && d !== false && d !== null
}

function isContentEditable(props: Readonly<AnyRecord>): boolean {
  const c = props['contenteditable'] ?? props['contentEditable']
  return c === '' || c === true || c === 'true' || c === 'plaintext-only'
}

function hasHref(props: Readonly<AnyRecord>): boolean {
  return props['href'] !== undefined && props['href'] !== null
}

/**
 * Whether an element is reachable in the sequential keyboard tab order — a native control its
 * own attributes leave tabbable, `tabindex >= 0`, or `contenteditable`.
 *
 * This is **tabbability, not raw focusability**: `tabindex="-1"` is deliberately treated as *not*
 * qualifying, even though such an element can still receive programmatic focus. The one consumer
 * (`#checkAriaHiddenOnFocusable`) cares about content a keyboard user can land on, and `../pk`'s
 * behavior — `aria-hidden` on `<h2 tabindex="-1">` is not flagged — depends on this. If the
 * contract system ever needs to separate focusability from tabbability, split this into
 * `isPotentiallyFocusable` / `isPotentiallyTabbable`; until then one predicate with this policy
 * is enough.
 *
 * Absent `tabindex`, `contenteditable` makes anything tabbable; otherwise the answer is per
 * native tag, gated on that tag's own attributes.
 */
export function isPotentiallyFocusable(tag: string, props: Readonly<AnyRecord>): boolean {
  const tabindex = parseTabIndex(props['tabindex'] ?? props['tabIndex'])
  if (tabindex !== undefined) return tabindex >= 0

  if (isContentEditable(props)) return true

  switch (tag) {
    case 'a':
    case 'area':
      return hasHref(props)
    case 'input':
      return props['type'] !== 'hidden' && !isDisabled(props)
    case 'button':
    case 'select':
    case 'textarea':
      return !isDisabled(props)
    default:
      return false
  }
}
