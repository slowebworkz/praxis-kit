import type { IntrinsicTag } from '@praxis-kit/primitive/types'
import type { IntrinsicProps } from '../types'
import {
  getConditionalImplicitRole,
  getInputImplicitRole,
  isStandaloneTag,
  isStrongImplicitRole,
} from '@praxis-kit/primitive/guards/aria'
import { IMPLICIT_ROLE_RECORD } from '@praxis-kit/primitive/constants/aria'
import type { Tag } from '@praxis-kit/primitive/constants/aria'

export { isStandaloneTag, isStrongImplicitRole }

// Returns the implicit ARIA role for a tag, optionally informed by props for
// elements whose role depends on attributes (input[type=...], section, form).
export function getImplicitRole(tag: IntrinsicTag, props?: IntrinsicProps): string | undefined {
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag as Tag]
  if (tag === 'input') return getInputImplicitRole(props?.type as string | undefined)
  // alt="" marks a decorative image (role=none); any other alt (including absent) keeps role=img.
  if (tag === 'img') return props?.alt === '' ? 'none' : 'img'
  if (tag === 'section' || tag === 'form') {
    return getConditionalImplicitRole(tag, props?.['aria-label'], props?.['aria-labelledby'])
  }
  return undefined
}
