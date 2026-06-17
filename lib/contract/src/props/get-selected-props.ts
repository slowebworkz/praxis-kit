import type { PropNormalizer } from '@praxis-kit/shared/types'

export const selectedProps: PropNormalizer = ({
  selected,
  'aria-selected': ariaSelected,
  'data-selected': dataSelected,
}) => {
  if (!selected) return {}

  return {
    ...(ariaSelected === undefined && {
      'aria-selected': 'true',
    }),
    ...(dataSelected === undefined && {
      'data-selected': '',
    }),
  }
}
