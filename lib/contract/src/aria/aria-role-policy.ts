import type { IntrinsicTag } from '@praxis-kit/shared/types'
import type { IntrinsicProps } from '../types'
import {
  getConditionalImplicitRole,
  getInputImplicitRole,
  isStandaloneTag,
  isStrongImplicitRole,
} from '@praxis-kit/shared/guards/aria'
import { IMPLICIT_ROLE_RECORD } from '@praxis-kit/shared/constants/aria'

export { isStandaloneTag, isStrongImplicitRole }

type Tag = keyof typeof IMPLICIT_ROLE_RECORD

// Returns the implicit ARIA role for a tag, optionally informed by props for
// elements whose role depends on attributes (input[type=...], section, form).
export function getImplicitRole(tag: IntrinsicTag, props?: IntrinsicProps): string | undefined {
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag as Tag]
  if (tag === 'input') return getInputImplicitRole(props?.type as string | undefined)
  if (tag === 'section' || tag === 'form') {
    return getConditionalImplicitRole(tag, props?.['aria-label'], props?.['aria-labelledby'])
  }
  return undefined
}
