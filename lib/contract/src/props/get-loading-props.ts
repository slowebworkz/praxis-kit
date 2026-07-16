import type { PropNormalizer } from '@praxis-kit/primitive'

export const loadingProps: PropNormalizer = ({
  loading,
  'aria-busy': ariaBusy,
  'data-loading': dataLoading,
}) => {
  if (!loading) return {}

  return {
    ...(ariaBusy === undefined && {
      'aria-busy': 'true',
    }),
    ...(dataLoading === undefined && {
      'data-loading': '',
    }),
  }
}
