import type { PropNormalizer } from '@praxis-kit/shared/types'

export const readonlyProps: PropNormalizer = ({
  readOnly,
  'aria-readonly': ariaReadonly,
  'data-readonly': dataReadonly,
}) => {
  if (!readOnly) return {}

  return {
    ...(ariaReadonly === undefined && {
      'aria-readonly': 'true',
    }),
    ...(dataReadonly === undefined && {
      'data-readonly': '',
    }),
  }
}
