import type { IntrinsicTag, Tag } from '@praxis-kit/primitive'
import type { IntrinsicProps } from '../types'
import { IMPLICIT_ROLE_RECORD } from '@praxis-kit/primitive'
import {
  getAnchorImplicitRole,
  getConditionalImplicitRole,
  getInputImplicitRole,
  getSelectImplicitRole,
  hasStandaloneRole,
  isStrongImplicitRole,
} from '@praxis-kit/guards'

export { hasStandaloneRole, isStrongImplicitRole }

// Returns the implicit ARIA role for a tag, optionally informed by props, and (for header/footer)
// by ancestor tags when available.
const LANDMARK_CONTEXT_BOUNDARIES: ReadonlySet<IntrinsicTag> = new Set([
  'article',
  'aside',
  'main',
  'nav',
  'section',
])

export function getImplicitRole(
  tag: IntrinsicTag,
  props?: IntrinsicProps,
  ancestorTags?: readonly IntrinsicTag[],
): string | undefined {
  // HTML-ARIA maps header/footer to generic when nested inside a sectioning/landmark
  // boundary. Without supplied ancestry, retain the historical single-element result.
  if (
    (tag === 'header' || tag === 'footer') &&
    ancestorTags?.some((ancestorTag) => LANDMARK_CONTEXT_BOUNDARIES.has(ancestorTag))
  ) {
    return 'generic'
  }
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag as Tag]
  // <a>/<area> is a `link` with an href, `generic` without.
  if (tag === 'a' || tag === 'area') return getAnchorImplicitRole(props?.href)
  if (tag === 'input') return getInputImplicitRole(props?.type, props?.list)
  // <select> is a combobox by default, a listbox with `multiple` or `size > 1`.
  if (tag === 'select') return getSelectImplicitRole(props?.multiple, props?.size)
  // alt="" marks a decorative image (role=none); any other alt (including absent) keeps role=img.
  if (tag === 'img') return props?.alt === '' ? 'none' : 'img'
  if (tag === 'section' || tag === 'form') {
    return getConditionalImplicitRole(tag, props?.['aria-label'], props?.['aria-labelledby'])
  }
  return undefined
}
