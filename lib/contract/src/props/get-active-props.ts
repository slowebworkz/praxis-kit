import type { PropNormalizer } from '@praxis-kit/shared/types'

export const activeProps: PropNormalizer = ({
  active,
  'aria-current': ariaCurrent,
  'data-active': dataActive,
}) => {
  if (!active) return {}

  return {
    ...(ariaCurrent === undefined && {
      'aria-current': 'true',
    }),
    ...(dataActive === undefined && {
      'data-active': '',
    }),
  }
}
