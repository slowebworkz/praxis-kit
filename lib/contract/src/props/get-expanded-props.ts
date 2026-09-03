import type { PropNormalizer } from '@praxis-kit/primitive'

export const expandedProps: PropNormalizer = ({
  expanded,
  'aria-expanded': ariaExpanded,
  'data-expanded': dataExpanded,
}) => {
  if (!expanded) return {}

  return {
    ...(ariaExpanded === undefined && {
      'aria-expanded': 'true',
    }),
    ...(dataExpanded === undefined && {
      'data-expanded': '',
    }),
  }
}
