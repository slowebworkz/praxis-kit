import type { IntrinsicTag, Tag } from '@praxis-kit/primitive'
import type { IntrinsicProps } from '../types'
import {
  getAnchorImplicitRole,
  getConditionalImplicitRole,
  getInputImplicitRole,
  getSelectImplicitRole,
  hasStandaloneRole,
  isStrongImplicitRole,
  IMPLICIT_ROLE_RECORD,
} from '@praxis-kit/primitive'

export { hasStandaloneRole, isStrongImplicitRole }

// Returns the implicit ARIA role for a tag, optionally informed by props for
// elements whose role depends on attributes (a/area, input[type=...], select, section, form).
export function getImplicitRole(tag: IntrinsicTag, props?: IntrinsicProps): string | undefined {
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
