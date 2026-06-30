import type { PropNormalizer } from '@praxis-kit/primitive/types'

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
